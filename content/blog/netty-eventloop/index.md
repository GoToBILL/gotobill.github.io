---
title: "Netty 이벤트 루프 완전 정복"
date: "2025-10-09"
description: "Netty의 이벤트 루프 방식이 어떻게 수천 개의 연결을 소수의 스레드로 처리하는지 깊이 있게 분석합니다"
category: "개발"
tags: ["Netty", "Event Loop", "NIO", "비동기", "네트워크"]
---

# Netty 완전 정복 가이드

Selector 기초부터 OS 레벨 동작, 순수 Java NIO vs Netty 구현, WebClient까지 모든 것을 다룹니다.

## 목차
1. [Selector란 무엇인가](#selector란-무엇인가)
2. [OS 레벨 I/O 멀티플렉싱](#os-레벨-io-멀티플렉싱)
3. [순수 Java NIO 구현](#순수-java-nio-구현)
4. [Netty NioEventLoop 구현](#netty-nioeventloop-구현)
5. [코드 비교 분석](#코드-비교-분석)
6. [WebClient에서 Netty까지](#webclient에서-netty까지)
7. [성능 최적화 기법](#성능-최적화-기법)

---

## Selector란 무엇인가

### 개념

**Selector**는 단일 스레드로 여러 채널의 I/O 이벤트를 모니터링하는 Java NIO의 핵심 컴포넌트입니다.

```
전통적인 블로킹 I/O (BIO)
Thread 1 → Socket 1 (blocking read...)
Thread 2 → Socket 2 (blocking read...)
Thread 3 → Socket 3 (blocking read...)
...
Thread 1000 → Socket 1000 (blocking read...)

문제: 1000개 연결 = 1000개 스레드 = 메모리 부족
```

```
Selector 기반 논블로킹 I/O (NIO)
        Selector (1개 스레드)
            ↓
    ┌───────┼───────┐
Channel 1 Channel 2 Channel 3 ... Channel 1000
(wait)    (ready!)   (wait)         (wait)

해결: 1000개 연결 = 1개 스레드 = 메모리 효율적
```

### Selector의 역할

1. **채널 등록**: 여러 채널을 Selector에 등록
2. **이벤트 감시**: 등록된 채널의 I/O 이벤트 모니터링
3. **준비된 채널 선택**: I/O 가능한 채널만 선택
4. **이벤트 처리**: 선택된 채널에 대해 I/O 작업 수행

### SelectionKey의 이벤트 타입

```java
SelectionKey.OP_ACCEPT   // 서버가 클라이언트 연결 수락 가능
SelectionKey.OP_CONNECT  // 클라이언트가 서버 연결 완료
SelectionKey.OP_READ     // 채널에서 데이터 읽기 가능
SelectionKey.OP_WRITE    // 채널에 데이터 쓰기 가능
```

---

## OS 레벨 I/O 멀티플렉싱

### System Call의 진화

#### 1단계: select() (초기)

```c
// Linux select() system call
int select(int nfds,
           fd_set *readfds,    // 읽기 가능한 파일 디스크립터
           fd_set *writefds,   // 쓰기 가능한 파일 디스크립터
           fd_set *exceptfds,  // 예외 발생한 파일 디스크립터
           struct timeval *timeout);
```

**문제점**:
- fd_set 크기 제한 (일반적으로 1024개)
- 매번 전체 fd_set을 커널로 복사 (O(n))
- 준비된 fd를 찾기 위해 전체 순회 필요

#### 2단계: poll() (개선)

```c
// Linux poll() system call
int poll(struct pollfd *fds,  // 파일 디스크립터 배열
         nfds_t nfds,          // 배열 크기
         int timeout);

struct pollfd {
    int fd;           // 파일 디스크립터
    short events;     // 관심 이벤트
    short revents;    // 실제 발생한 이벤트
};
```

**개선점**:
- fd 개수 제한 없음
- 비트마스크 대신 구조체 배열 사용

**여전한 문제**:
- 매번 전체 배열을 커널로 복사 (O(n))
- 준비된 fd를 찾기 위해 전체 순회

#### 3단계: epoll() (Linux 최적화)

```c
// epoll 생성
int epfd = epoll_create1(0);

// fd 등록 (한 번만!)
struct epoll_event event;
event.events = EPOLLIN;  // 읽기 이벤트
event.data.fd = sockfd;
epoll_ctl(epfd, EPOLL_CTL_ADD, sockfd, &event);

// 이벤트 대기
struct epoll_event events[MAX_EVENTS];
int nfds = epoll_wait(epfd, events, MAX_EVENTS, timeout);

// 준비된 fd만 반환됨! (O(1) 조회)
for (int i = 0; i < nfds; i++) {
    if (events[i].events & EPOLLIN) {
        // 읽기 가능한 소켓 처리
        int fd = events[i].data.fd;
        read(fd, buffer, size);
    }
}
```

**핵심 개선**:
- fd를 커널에 한 번만 등록
- 준비된 fd만 반환 (O(1) 조회)
- Red-Black Tree로 fd 관리
- Ready List에 준비된 fd만 추가

#### 4단계: kqueue() (BSD/macOS)

```c
// kqueue 생성
int kq = kqueue();

// 이벤트 등록
struct kevent change;
EV_SET(&change, sockfd, EVFILT_READ, EV_ADD, 0, 0, NULL);
kevent(kq, &change, 1, NULL, 0, NULL);

// 이벤트 대기
struct kevent event;
int nev = kevent(kq, NULL, 0, &event, 1, NULL);

if (nev > 0 && event.filter == EVFILT_READ) {
    // 읽기 가능
    read(event.ident, buffer, size);
}
```

### Java NIO와 OS의 연결

```
Java Selector.select()
        ↓
JNI (Java Native Interface)
        ↓
┌───────────────────────────────┐
│   Linux    │   macOS   │ Windows │
│   epoll()  │  kqueue() │  IOCP   │
└───────────────────────────────┘
        ↓
커널이 파일 디스크립터 모니터링
        ↓
네트워크 카드에서 패킷 도착
        ↓
커널 인터럽트 발생
        ↓
Ready List에 fd 추가
        ↓
epoll_wait() 반환
        ↓
Java Selector.select() 반환
```

### OS별 구현 차이

| OS | System Call | 특징 |
|---|---|---|
| Linux | epoll | Red-Black Tree, O(1) 조회 |
| macOS/BSD | kqueue | Event-driven, 파일 시스템 감시도 가능 |
| Windows | IOCP | Completion 기반, 비동기 I/O |
| Solaris | /dev/poll | poll 최적화 버전 |

---

## 순수 Java NIO 구현

### 전체 코드

```java
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.util.Iterator;
import java.util.Set;

public class NioEchoServer {

    private static final int PORT = 7381;
    private static final int BUFFER_SIZE = 1024;

    public static void main(String[] args) throws IOException {
        // 1. Selector 생성 - OS의 epoll/kqueue와 연결
        Selector selector = Selector.open();

        // 2. 서버 소켓 생성 및 설정
        ServerSocketChannel serverSocket = ServerSocketChannel.open();
        serverSocket.bind(new InetSocketAddress(PORT));
        serverSocket.configureBlocking(false);  // 논블로킹 모드!

        // 3. Selector에 서버 소켓 등록 (ACCEPT 이벤트 감시)
        serverSocket.register(selector, SelectionKey.OP_ACCEPT);

        System.out.println("Echo Server started on port " + PORT);

        ByteBuffer inBuffer = ByteBuffer.allocate(BUFFER_SIZE);
        ByteBuffer outBuffer = ByteBuffer.allocate(BUFFER_SIZE);

        // 4. 이벤트 루프 - 무한 반복
        while (true) {
            // 5. I/O 이벤트 대기 (블로킹) - OS epoll_wait() 호출
            selector.select();

            // 6. 준비된 채널의 SelectionKey 가져오기
            Set<SelectionKey> selectedKeys = selector.selectedKeys();
            Iterator<SelectionKey> iterator = selectedKeys.iterator();

            // 7. 준비된 채널 순회
            while (iterator.hasNext()) {
                SelectionKey key = iterator.next();
                iterator.remove();  // 처리 후 제거 (중요!)

                try {
                    // 8-1. ACCEPT 이벤트: 클라이언트 연결
                    if (key.isAcceptable()) {
                        ServerSocketChannel server = (ServerSocketChannel) key.channel();
                        SocketChannel client = server.accept();  // 연결 수락

                        if (client != null) {
                            client.configureBlocking(false);
                            // 클라이언트를 READ 이벤트로 등록
                            client.register(selector, SelectionKey.OP_READ);
                            System.out.println("Client connected: " + client.getRemoteAddress());
                        }
                    }
                    // 8-2. READ 이벤트: 데이터 읽기
                    else if (key.isReadable()) {
                        SocketChannel channel = (SocketChannel) key.channel();

                        inBuffer.clear();
                        int readBytes = channel.read(inBuffer);  // 논블로킹 읽기

                        if (readBytes == -1) {
                            // 클라이언트 연결 종료
                            System.out.println("Client disconnected: " + channel.getRemoteAddress());
                            key.cancel();
                            channel.close();
                        } else if (readBytes > 0) {
                            // 읽은 데이터를 출력 버퍼로 복사 (Echo)
                            inBuffer.flip();
                            outBuffer.clear();
                            outBuffer.put(inBuffer);

                            // 쓰기 준비
                            outBuffer.flip();
                            channel.write(outBuffer);  // 논블로킹 쓰기

                            System.out.println("Echoed " + readBytes + " bytes");
                        }
                    }
                } catch (IOException e) {
                    System.err.println("Error processing key: " + e.getMessage());
                    key.cancel();
                    try {
                        key.channel().close();
                    } catch (IOException ex) {
                        // ignore
                    }
                }
            }
        }
    }
}
```

### 동작 흐름

```
1. Selector.open()
   ↓
   JNI → epoll_create1() (Linux)
   ↓
   커널에 epoll 인스턴스 생성

2. serverSocket.register(selector, OP_ACCEPT)
   ↓
   JNI → epoll_ctl(EPOLL_CTL_ADD, fd, EPOLLIN)
   ↓
   커널의 Red-Black Tree에 fd 등록

3. selector.select()
   ↓
   JNI → epoll_wait(timeout)
   ↓
   커널이 Ready List 확인 (블로킹 대기)
   ↓
   패킷 도착 → 인터럽트 → Ready List에 fd 추가
   ↓
   epoll_wait() 반환 (준비된 fd 개수)
   ↓
   Java로 복귀

4. selector.selectedKeys()
   ↓
   준비된 SelectionKey 집합 반환

5. key.isAcceptable() / key.isReadable()
   ↓
   이벤트 타입 확인 및 처리

6. channel.read(buffer) / channel.write(buffer)
   ↓
   JNI → read(fd, buf, len) / write(fd, buf, len)
   ↓
   실제 I/O 수행 (논블로킹)
```

---

## Netty NioEventLoop 구현

### 1. Selector 생성

**순수 Java NIO**
```java
Selector selector = Selector.open();
```

**Netty NioEventLoop** (라인 169~230)
```java
private SelectorTuple openSelector() {
    final Selector unwrappedSelector;
    try {
        // OS의 epoll/kqueue와 연결
        unwrappedSelector = provider.openSelector();
    } catch (IOException e) {
        throw new ChannelException("failed to open a new selector", e);
    }

    if (DISABLE_KEY_SET_OPTIMIZATION) {
        return new SelectorTuple(unwrappedSelector);
    }

    // Netty 최적화: selectedKeys를 Array로 교체
    final SelectedSelectionKeySet selectedKeySet = new SelectedSelectionKeySet();

    // Reflection으로 Selector 내부 필드 교체
    Object maybeException = AccessController.doPrivileged(new PrivilegedAction<Object>() {
        @Override
        public Object run() {
            try {
                Field selectedKeysField = selectorImplClass.getDeclaredField("selectedKeys");
                Field publicSelectedKeysField = selectorImplClass.getDeclaredField("publicSelectedKeys");

                // Set → Array로 교체 (순회 성능 향상!)
                selectedKeysField.set(unwrappedSelector, selectedKeySet);
                publicSelectedKeysField.set(unwrappedSelector, selectedKeySet);
                return null;
            } catch (Exception e) {
                return e;
            }
        }
    });

    selectedKeys = selectedKeySet;
    return new SelectorTuple(unwrappedSelector,
                             new SelectedSelectionKeySetSelector(unwrappedSelector, selectedKeySet));
}
```

**Netty 최적화 포인트**:
- Selector 내부의 `Set<SelectionKey>`를 배열로 교체
- Set 순회보다 배열 순회가 빠름 (캐시 친화적)

### 2. 채널 등록

**순수 Java NIO**
```java
serverSocket.register(selector, SelectionKey.OP_ACCEPT);
client.register(selector, SelectionKey.OP_READ);
```

**Netty NioEventLoop** (라인 302~340)
```java
public void register(final SelectableChannel ch, final int interestOps, final NioTask<?> task) {
    ObjectUtil.checkNotNull(ch, "ch");
    if (interestOps == 0) {
        throw new IllegalArgumentException("interestOps must be non-zero.");
    }

    if (isShutdown()) {
        throw new IllegalStateException("event loop shut down");
    }

    // EventLoop 스레드에서 실행 중인지 확인
    if (inEventLoop()) {
        // 같은 스레드면 즉시 실행
        register0(ch, interestOps, task);
    } else {
        // 다른 스레드면 EventLoop에 제출
        try {
            submit(new Runnable() {
                @Override
                public void run() {
                    register0(ch, interestOps, task);
                }
            }).sync();
        } catch (InterruptedException ignore) {
            Thread.currentThread().interrupt();
        }
    }
}

private void register0(SelectableChannel ch, int interestOps, NioTask<?> task) {
    try {
        // 실제 등록 - OS epoll_ctl() 호출
        ch.register(unwrappedSelector, interestOps, task);
    } catch (Exception e) {
        throw new EventLoopException("failed to register a channel", e);
    }
}
```

**Netty 최적화 포인트**:
- 스레드 안전성 보장 (다른 스레드에서 등록 가능)
- EventLoop 스레드에서만 실제 등록 수행

### 3. 이벤트 루프 - run()

**순수 Java NIO**
```java
while (true) {
    selector.select();
    Set<SelectionKey> selectedKeys = selector.selectedKeys();
    Iterator<SelectionKey> iterator = selectedKeys.iterator();
    while (iterator.hasNext()) {
        SelectionKey key = iterator.next();
        // 처리...
    }
}
```

**Netty NioEventLoop** (라인 441~555)
```java
@Override
protected void run() {
    int selectCnt = 0;
    for (;;) {  // 무한 루프
        try {
            int strategy;
            try {
                // 전략 계산: SELECT, CONTINUE, BUSY_WAIT
                strategy = selectStrategy.calculateStrategy(selectNowSupplier, hasTasks());
                switch (strategy) {
                    case SelectStrategy.CONTINUE:
                        continue;

                    case SelectStrategy.BUSY_WAIT:
                        // NIO는 busy-wait 미지원, SELECT로 fall-through

                    case SelectStrategy.SELECT:
                        // 다음 예약된 작업의 데드라인 계산
                        long curDeadlineNanos = nextScheduledTaskDeadlineNanos();
                        if (curDeadlineNanos == -1L) {
                            curDeadlineNanos = NONE;
                        }
                        nextWakeupNanos.set(curDeadlineNanos);
                        try {
                            if (!hasTasks()) {
                                // Task 없으면 I/O 대기
                                strategy = select(curDeadlineNanos);
                            }
                        } finally {
                            nextWakeupNanos.lazySet(AWAKE);
                        }
                        // fall through
                    default:
                }
            } catch (IOException e) {
                // Selector 문제 발생 시 재구성
                rebuildSelector0();
                selectCnt = 0;
                handleLoopException(e);
                continue;
            }

            selectCnt++;
            cancelledKeys = 0;
            needsToSelectAgain = false;

            // I/O 작업과 일반 Task의 비율 설정 (기본 50:50)
            final int ioRatio = this.ioRatio;
            boolean ranTasks;

            if (ioRatio == 100) {
                // I/O 100%: I/O 먼저, Task는 남은 시간 전부
                try {
                    if (strategy > 0) {
                        processSelectedKeys();  // I/O 이벤트 처리
                    }
                } finally {
                    ranTasks = runAllTasks();  // 모든 Task 처리
                }
            } else if (strategy > 0) {
                // I/O와 Task 비율 조절
                final long ioStartTime = System.nanoTime();
                try {
                    processSelectedKeys();  // I/O 처리
                } finally {
                    final long ioTime = System.nanoTime() - ioStartTime;
                    // I/O 시간에 비례해서 Task 시간 계산
                    ranTasks = runAllTasks(ioTime * (100 - ioRatio) / ioRatio);
                }
            } else {
                // I/O 없음: 최소한의 Task만 처리
                ranTasks = runAllTasks(0);
            }

            if (ranTasks || strategy > 0) {
                if (selectCnt > MIN_PREMATURE_SELECTOR_RETURNS && logger.isDebugEnabled()) {
                    logger.debug("Selector.select() returned prematurely {} times in a row",
                            selectCnt - 1);
                }
                selectCnt = 0;
            } else if (unexpectedSelectorWakeup(selectCnt)) {
                // 예기치 않은 wakeup (JDK epoll bug 대응)
                selectCnt = 0;
            }
        } catch (CancelledKeyException e) {
            // 무해한 예외, 로그만
            if (logger.isDebugEnabled()) {
                logger.debug(CancelledKeyException.class.getSimpleName() + " raised", e);
            }
        } catch (Error e) {
            throw e;
        } catch (Throwable t) {
            handleLoopException(t);
        } finally {
            // 종료 처리
            try {
                if (isShuttingDown()) {
                    closeAll();
                    if (confirmShutdown()) {
                        return;
                    }
                }
            } catch (Error e) {
                throw e;
            } catch (Throwable t) {
                handleLoopException(t);
            }
        }
    }
}
```

**Netty 최적화 포인트**:
1. **ioRatio**: I/O 작업과 일반 Task의 CPU 시간 비율 조절
2. **JDK epoll bug 대응**: 예기치 않은 wakeup 감지 및 Selector 재구성
3. **예약된 작업 고려**: 타임아웃을 다음 예약 작업에 맞춤

### 4. selector.select() 호출

**순수 Java NIO**
```java
selector.select();  // 무한 대기
// 또는
selector.select(timeout);  // 타임아웃 대기
```

**Netty NioEventLoop** (라인 885~893)
```java
private int select(long deadlineNanos) throws IOException {
    if (deadlineNanos == NONE) {
        // 예약된 작업 없음: 무한 대기
        return selector.select();  // OS epoll_wait(-1)
    }

    // 데드라인까지 남은 시간 계산
    long timeoutMillis = deadlineToDelayNanos(deadlineNanos + 995000L) / 1000000L;

    // 타임아웃이 0 이하면 논블로킹 select
    return timeoutMillis <= 0 ? selector.selectNow(): selector.select(timeoutMillis);
    //                          ↑ 즉시 반환           ↑ 타임아웃 대기
}
```

**호출 흐름**:
```
selector.select(timeoutMillis)
    ↓
JNI
    ↓
Linux: epoll_wait(epfd, events, maxevents, timeout)
macOS: kevent(kq, NULL, 0, events, nevents, timeout)
    ↓
커널이 Ready List 확인
    ↓
패킷 도착 or 타임아웃
    ↓
반환 (준비된 fd 개수)
```

### 5. selectedKeys 처리

**순수 Java NIO**
```java
Set<SelectionKey> selectedKeys = selector.selectedKeys();
Iterator<SelectionKey> iterator = selectedKeys.iterator();
while (iterator.hasNext()) {
    SelectionKey key = iterator.next();
    iterator.remove();
    // 처리...
}
```

**Netty NioEventLoop - 최적화된 버전** (라인 719~753)
```java
private void processSelectedKeysOptimized() {
    // selectedKeys는 배열로 교체됨 (openSelector에서)
    for (int i = 0; i < selectedKeys.size; ++i) {
        final SelectionKey k = selectedKeys.keys[i];

        // GC를 위해 null 처리
        selectedKeys.keys[i] = null;

        final Object a = k.attachment();

        if (a instanceof AbstractNioChannel) {
            processSelectedKey(k, (AbstractNioChannel) a);
        } else {
            @SuppressWarnings("unchecked")
            NioTask<SelectableChannel> task = (NioTask<SelectableChannel>) a;
            processSelectedKey(k, task);
        }

        if (needsToSelectAgain) {
            // 배열 초기화
            selectedKeys.reset(i + 1);
            selectAgain();
            i = -1;
        }
    }
}
```

**Netty NioEventLoop - 일반 버전** (라인 673~711)
```java
private void processSelectedKeysPlain(Set<SelectionKey> selectedKeys) {
    if (selectedKeys.isEmpty()) {
        return;
    }

    Iterator<SelectionKey> i = selectedKeys.iterator();
    for (;;) {
        final SelectionKey k = i.next();
        final Object a = k.attachment();
        i.remove();  // Iterator에서 제거

        if (a instanceof AbstractNioChannel) {
            processSelectedKey(k, (AbstractNioChannel) a);
        } else {
            @SuppressWarnings("unchecked")
            NioTask<SelectableChannel> task = (NioTask<SelectableChannel>) a;
            processSelectedKey(k, task);
        }

        if (!i.hasNext()) {
            break;
        }

        if (needsToSelectAgain) {
            selectAgain();
            selectedKeys = selector.selectedKeys();

            // ConcurrentModificationException 방지
            if (selectedKeys.isEmpty()) {
                break;
            } else {
                i = selectedKeys.iterator();
            }
        }
    }
}
```

**최적화 포인트**:
- Set Iterator 대신 배열 인덱스 사용
- Iterator 생성 오버헤드 제거
- 캐시 친화적인 순차 접근

### 6. 개별 이벤트 처리

**순수 Java NIO**
```java
if (key.isAcceptable()) {
    ServerSocketChannel server = (ServerSocketChannel) key.channel();
    SocketChannel client = server.accept();
    client.configureBlocking(false);
    client.register(selector, SelectionKey.OP_READ);
} else if (key.isReadable()) {
    SocketChannel channel = (SocketChannel) key.channel();
    int readBytes = channel.read(inBuffer);
    if (readBytes == -1) {
        channel.close();
    } else {
        // Echo
        inBuffer.flip();
        channel.write(inBuffer);
    }
}
```

**Netty NioEventLoop** (라인 768~821)
```java
private void processSelectedKey(SelectionKey k, AbstractNioChannel ch) {
    final AbstractNioChannel.NioUnsafe unsafe = ch.unsafe();

    // SelectionKey 유효성 검사
    if (!k.isValid()) {
        final EventLoop eventLoop;
        try {
            eventLoop = ch.eventLoop();
        } catch (Throwable ignored) {
            return;
        }

        // 이 EventLoop에 등록된 채널인지 확인
        if (eventLoop == this) {
            unsafe.close(unsafe.voidPromise());
        }
        return;
    }

    try {
        int readyOps = k.readyOps();

        // OP_CONNECT: 연결 완료
        if ((readyOps & SelectionKey.OP_CONNECT) != 0) {
            // OP_CONNECT 제거 (무한 루프 방지)
            int ops = k.interestOps();
            ops &= ~SelectionKey.OP_CONNECT;
            k.interestOps(ops);

            unsafe.finishConnect();
        }

        // OP_WRITE: 쓰기 가능
        if ((readyOps & SelectionKey.OP_WRITE) != 0) {
            // 버퍼에 남은 데이터 flush
            unsafe.forceFlush();
        }

        // OP_READ or OP_ACCEPT: 읽기/연결 수락
        // readyOps == 0 체크는 JDK bug workaround
        if ((readyOps & (SelectionKey.OP_READ | SelectionKey.OP_ACCEPT)) != 0 || readyOps == 0) {
            unsafe.read();
        }
    } catch (CancelledKeyException ignored) {
        unsafe.close(unsafe.voidPromise());
    }
}
```

**Netty의 Unsafe 클래스**:
- 실제 I/O 작업을 수행하는 내부 클래스
- 채널 타입별로 구현 (NioServerSocketChannel, NioSocketChannel 등)
- 사용자는 직접 호출 불가 (internal API)

---

## 코드 비교 분석

### 1. Selector 생성

| 항목 | 순수 Java NIO | Netty |
|---|---|---|
| 생성 | `Selector.open()` | `provider.openSelector()` + 최적화 |
| 최적화 | 없음 | selectedKeys를 Set → Array로 교체 |
| 코드 | 1줄 | ~60줄 (Reflection 포함) |

### 2. 이벤트 루프 구조

| 항목 | 순수 Java NIO | Netty |
|---|---|---|
| 루프 | `while(true)` | `for(;;)` + 종료 처리 |
| select() | 매번 호출 | 전략 패턴 (Task 있으면 skip) |
| Task 처리 | 없음 | I/O와 Task 비율 조절 (ioRatio) |
| 예외 처리 | 기본 try-catch | epoll bug 감지 및 재구성 |

### 3. selectedKeys 순회

| 항목 | 순수 Java NIO | Netty (최적화) |
|---|---|---|
| 자료구조 | `Set<SelectionKey>` | `SelectionKey[]` |
| 순회 | Iterator | 배열 인덱스 |
| 성능 | Iterator 생성 오버헤드 | 캐시 친화적 순차 접근 |

**성능 차이**:
```
Set Iterator 순회: ~100ns per iteration
Array 인덱스 순회: ~10ns per iteration

10배 빠름!
```

### 4. 이벤트 처리

| 항목 | 순수 Java NIO | Netty |
|---|---|---|
| 처리 방식 | 직접 I/O 호출 | Unsafe 클래스 위임 |
| 에러 처리 | 간단한 예외 처리 | 세밀한 상태 관리 |
| 확장성 | 하드코딩 | 채널 타입별 다형성 |

### 5. 스레드 모델

| 항목 | 순수 Java NIO | Netty |
|---|---|---|
| 스레드 개수 | 1개 (단일 스레드) | N개 (EventLoopGroup) |
| 스레드 안전성 | 보장 안 됨 | inEventLoop() 체크 |
| 작업 제출 | 지원 안 됨 | execute(Runnable) |

### 전체 비교표

```
┌─────────────────────────────────────────────────────────────┐
│                    순수 Java NIO                             │
├─────────────────────────────────────────────────────────────┤
│ while (true) {                                              │
│     selector.select();              // OS epoll_wait()      │
│     Set<SelectionKey> keys =                                │
│         selector.selectedKeys();                            │
│     Iterator<SelectionKey> it =                             │
│         keys.iterator();                                    │
│     while (it.hasNext()) {                                  │
│         SelectionKey key = it.next();                       │
│         it.remove();                                        │
│         if (key.isReadable()) {                             │
│             SocketChannel ch =                              │
│                 (SocketChannel) key.channel();              │
│             ch.read(buffer);        // 직접 I/O            │
│         }                                                   │
│     }                                                       │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘

                            VS

┌─────────────────────────────────────────────────────────────┐
│                      Netty NioEventLoop                      │
├─────────────────────────────────────────────────────────────┤
│ for (;;) {                                                  │
│     // 전략 계산: Task 있으면 select skip                   │
│     strategy = selectStrategy.calculate();                  │
│                                                             │
│     if (strategy == SELECT) {                               │
│         // 다음 예약 작업 고려한 타임아웃                    │
│         strategy = select(nextDeadline);                    │
│     }                                                       │
│                                                             │
│     // I/O 처리 (최적화된 배열 순회)                        │
│     if (strategy > 0) {                                     │
│         processSelectedKeys();      // 배열 인덱스 순회     │
│     }                                                       │
│                                                             │
│     // Task 처리 (I/O와 비율 조절)                          │
│     runAllTasks(ioTime * ratio);                            │
│                                                             │
│     // epoll bug 감지 및 재구성                             │
│     if (unexpectedWakeup()) {                               │
│         rebuildSelector();                                  │
│     }                                                       │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## WebClient에서 Netty까지

### 전체 호출 스택

```
┌─────────────────────────────────────────────────────────┐
│          Application Layer (당신의 코드)                  │
├─────────────────────────────────────────────────────────┤
│ WebClient.post()                                        │
│     .uri("/api")                                        │
│     .bodyValue(requestBody)                             │
│     .retrieve()                                         │
│     .bodyToMono(Map.class)                              │
│     .subscribe(...)                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│       Spring WebFlux Layer (DefaultWebClient)           │
├─────────────────────────────────────────────────────────┤
│ DefaultWebClient.exchange()                             │
│   → ExchangeFunction.exchange(request)                  │
│   → ReactorClientHttpConnector.connect()                │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│    Reactor Netty Layer (HttpClient)                     │
├─────────────────────────────────────────────────────────┤
│ HttpClient.request(POST)                                │
│     .uri("https://api.example.com")                     │
│     .send((request, outbound) -> ...)                   │
│     .responseConnection((response, connection) -> ...)  │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│       Netty Core Layer (NioEventLoop)                   │
├─────────────────────────────────────────────────────────┤
│ NioEventLoop.run()                                      │
│   for (;;) {                                            │
│       selector.select()      // I/O 이벤트 대기         │
│       processSelectedKeys()  // 이벤트 처리             │
│       runAllTasks()          // Task 처리               │
│   }                                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│          JNI Layer (Native Code)                        │
├─────────────────────────────────────────────────────────┤
│ EPollArrayWrapper.poll()     // Linux                   │
│ KQueueArrayWrapper.poll()    // macOS                   │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│           OS Kernel Layer                               │
├─────────────────────────────────────────────────────────┤
│ epoll_wait(epfd, events, maxevents, timeout)  // Linux  │
│ kevent(kq, NULL, 0, events, nevents, timeout) // macOS  │
│                                                         │
│ [Ready List 모니터링]                                   │
│   fd 1: 대기 중                                         │
│   fd 2: READ 준비 완료! ← 패킷 도착                     │
│   fd 3: 대기 중                                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│         Network Hardware Layer                          │
├─────────────────────────────────────────────────────────┤
│ 네트워크 카드에서 패킷 수신                              │
│   ↓                                                     │
│ 인터럽트 발생                                           │
│   ↓                                                     │
│ 커널이 Ready List에 fd 추가                             │
│   ↓                                                     │
│ epoll_wait() 반환                                       │
└─────────────────────────────────────────────────────────┘
```

### 상세 실행 흐름

#### 1. WebClient 요청 시작

```java
// 당신의 코드 (http-nio-8080-exec-5 스레드)
Mono<String> response = webClient.post()
    .uri("/api")
    .bodyValue(requestBody)
    .retrieve()
    .bodyToMono(String.class);

response.subscribe(data -> {
    // 이 부분은 reactor-http-nio-2에서 실행
    System.out.println(data);
});
```

#### 2. Spring WebFlux Layer

```java
// DefaultWebClient.java
private Mono<ClientResponse> exchange() {
    return Mono.defer(() -> {
        // HTTP 요청 생성
        ClientHttpRequest httpRequest = createRequest();

        // ReactorClientHttpConnector로 전달
        return this.connector.connect(
            this.method,
            this.uri,
            requestCallback
        );
    });
}
```

#### 3. Reactor Netty Layer

```java
// ReactorClientHttpConnector.java
@Override
public Mono<ClientHttpResponse> connect(HttpMethod method, URI uri, ...) {
    return this.httpClient
        .request(adaptHttpMethod(method))
        .uri(uri.toString())
        .send((request, outbound) -> {
            // 요청 본문 전송
            return requestCallback.apply(new ReactorClientHttpRequest(...));
        })
        .responseConnection((response, connection) -> {
            // 응답 수신
            return Mono.just(new ReactorClientHttpResponse(...));
        });
}
```

#### 4. Netty Core - Channel 등록

```java
// Bootstrap.java
public ChannelFuture connect(SocketAddress remoteAddress) {
    ChannelFuture regFuture = initAndRegister();

    // Channel을 EventLoop에 등록
    Channel channel = regFuture.channel();
    EventLoop eventLoop = channel.eventLoop();

    // EventLoop에서 실행
    eventLoop.execute(() -> {
        channel.register(selector, SelectionKey.OP_CONNECT);
        channel.connect(remoteAddress);
    });

    return regFuture;
}
```

#### 5. Netty Core - EventLoop 동작

```java
// NioEventLoop.run() - reactor-http-nio-2 스레드
for (;;) {
    // 1. I/O 이벤트 대기
    selector.select(timeoutMillis);
    //   ↓
    // JNI → epoll_wait()
    //   ↓
    // 커널이 Ready List 확인
    //   ↓
    // HTTP 응답 패킷 도착!
    //   ↓
    // fd가 READ 가능 상태가 됨
    //   ↓
    // epoll_wait() 반환

    // 2. 준비된 채널 처리
    processSelectedKeys();
    //   ↓
    for (int i = 0; i < selectedKeys.size; i++) {
        SelectionKey key = selectedKeys.keys[i];
        AbstractNioChannel channel = (AbstractNioChannel) key.attachment();

        if (key.readyOps & OP_READ) {
            // 3. 데이터 읽기
            channel.unsafe().read();
            //   ↓
            // ByteBuffer에 데이터 읽기
            ByteBuffer buffer = ByteBuffer.allocate(8192);
            int bytesRead = socketChannel.read(buffer);
            //   ↓
            // 4. Pipeline 처리
            ChannelPipeline pipeline = channel.pipeline();
            pipeline.fireChannelRead(buffer);
            //   ↓
            // HttpClientCodec: HTTP 파싱
            // HttpObjectAggregator: 청크 병합
            // ReactorNettyHandler: Mono/Flux로 변환
            //   ↓
            // 5. Mono에 데이터 전달
            sink.next(httpResponse);
        }
    }

    // 6. 일반 Task 처리
    runAllTasks();
}
```

#### 6. 데이터가 Mono로 전달

```java
// reactor-http-nio-2 스레드
mono
    .doOnNext(response -> {
        // 여기서 실행!
        log.info("Thread: {}", Thread.currentThread().getName());
        // 출력: Thread: reactor-http-nio-2
    })
    .map(this::parseResponse)
    .subscribe(data -> {
        // 최종 처리
        System.out.println(data);
    });
```

---

## 성능 최적화 기법

### 1. Zero-Copy

**일반적인 데이터 복사**:
```
네트워크 카드
    ↓ DMA 복사
커널 버퍼
    ↓ CPU 복사 (1)
JVM 힙
    ↓ CPU 복사 (2)
애플리케이션 버퍼

총 4번의 데이터 이동!
```

**Netty의 Zero-Copy**:
```java
// Direct Buffer 사용
ByteBuffer directBuffer = ByteBuffer.allocateDirect(8192);

// 네트워크 카드
//     ↓ DMA 복사
// 커널 버퍼
//     ↓ DMA 복사 (CPU 개입 없음!)
// Direct Buffer (JVM 힙 외부)
//     ↓
// 애플리케이션 직접 접근

총 2번의 이동, CPU 사용 최소화!
```

**Netty CompositeByteBuf**:
```java
// 여러 버퍼를 복사 없이 결합
ByteBuf header = ...;
ByteBuf body = ...;

CompositeByteBuf composite = Unpooled.compositeBuffer();
composite.addComponents(true, header, body);
// 실제 복사 없음! 논리적 결합만
```

### 2. Object Pooling

```java
// Netty의 PooledByteBufAllocator
ByteBufAllocator alloc = PooledByteBufAllocator.DEFAULT;

// 풀에서 재사용
ByteBuf buffer = alloc.buffer(8192);
try {
    buffer.writeBytes(data);
    channel.write(buffer);
} finally {
    // 풀로 반환 (GC 없음!)
    buffer.release();
}
```

**효과**:
- GC 압박 감소
- 메모리 할당 오버헤드 제거
- 처리량 30-50% 향상

### 3. 배치 처리

```java
// NioEventLoop - 여러 이벤트를 한 번에 처리
private void processSelectedKeys() {
    for (int i = 0; i < selectedKeys.size; ++i) {
        // 배치 처리로 시스템 콜 최소화
        processSelectedKey(selectedKeys.keys[i]);
    }
}

// Write 배치 처리
private void flush() {
    // 여러 write를 모아서 한 번에 전송
    ByteBuf[] buffers = outboundBuffer.nioBuffers();
    long bytesWritten = channel.write(buffers);
}
```

### 4. Backpressure

```java
// Netty의 자동 Backpressure
channel.config().setAutoRead(false);  // 읽기 중단

// 처리 완료 후 재개
channel.read();  // 읽기 재개
```

**Reactor의 Backpressure**:
```java
Flux.range(1, 1000000)
    .onBackpressureBuffer(1000)  // 버퍼링
    .onBackpressureDrop()         // 드랍
    .onBackpressureLatest()       // 최신 값만
    .subscribe(new BaseSubscriber<Integer>() {
        @Override
        protected void hookOnSubscribe(Subscription subscription) {
            request(10);  // 10개만 요청
        }

        @Override
        protected void hookOnNext(Integer value) {
            // 처리
            request(1);  // 1개 더 요청
        }
    });
```

### 5. 스레드 친화성 (Thread Affinity)

```java
// EventLoopGroup - CPU 코어별 EventLoop
EventLoopGroup group = new NioEventLoopGroup(
    Runtime.getRuntime().availableProcessors() * 2
);

// 각 EventLoop는 하나의 Selector를 가짐
// → CPU 캐시 친화적
```

---

## 정리

### Java NIO Selector의 핵심

1. **단일 스레드로 다중 채널 처리**
2. **OS 커널의 I/O 멀티플렉싱 활용**
3. **논블로킹 I/O로 스레드 블로킹 없음**

### Netty가 Java NIO보다 나은 이유

1. **성능 최적화**
   - selectedKeys를 Set → Array로 교체
   - Zero-Copy 기술
   - Object Pooling

2. **안정성**
   - JDK epoll bug 자동 감지 및 복구
   - 세밀한 에러 처리
   - Backpressure 지원

3. **확장성**
   - EventLoopGroup으로 멀티 스레드
   - Channel Pipeline으로 확장 가능
   - 다양한 프로토콜 지원

4. **사용성**
   - 고수준 추상화 (Channel, Pipeline)
   - Reactor와 통합
   - Spring WebFlux 기본 클라이언트

### WebClient → Netty → OS 전체 흐름

```
WebClient.subscribe()
    ↓ (메인 스레드)
Mono 체인 구성
    ↓
ReactorClientHttpConnector
    ↓
Netty HttpClient.request()
    ↓
Channel.write() → EventLoop에 제출
    ↓ (reactor-http-nio-2 스레드)
NioEventLoop.execute(task)
    ↓
selector.select() 호출
    ↓ (JNI)
epoll_wait() / kevent() 호출
    ↓ (OS 커널)
Ready List 모니터링
    ↓
네트워크 패킷 도착
    ↓
인터럽트 발생
    ↓
Ready List에 fd 추가
    ↓
epoll_wait() 반환
    ↓ (Java)
processSelectedKeys()
    ↓
channel.read() → ByteBuf
    ↓
Pipeline 처리 (HTTP 파싱)
    ↓
Mono.next(response)
    ↓
.doOnNext() 실행
    ↓
.subscribe() 콜백 실행
```

### 핵심 코드 위치

**Java NIO**:
- `java.nio.channels.Selector`
- `java.nio.channels.SelectionKey`
- `java.nio.channels.SocketChannel`

**Netty**:
- `io.netty.channel.nio.NioEventLoop` - EventLoop 구현
- `io.netty.channel.nio.NioSocketChannel` - Channel 구현
- `io.netty.buffer.ByteBuf` - 버퍼 추상화
- `io.netty.channel.ChannelPipeline` - 처리 파이프라인

**Reactor Netty**:
- `reactor.netty.http.client.HttpClient`
- `reactor.netty.Connection`

**Spring WebFlux**:
- `org.springframework.web.reactive.function.client.WebClient`
- `org.springframework.http.client.reactive.ReactorClientHttpConnector`


> **Netty 이벤트 루프를 이해하면 WebClient의 비동기 처리를 완전히 이해할 수 있습니다**
>
> \
> [Spring WebClient와 논블로킹 I/O](../webclient)에서 WebClient의 실전 사용법을 확인하세요.
