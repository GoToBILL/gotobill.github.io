import React, { useState } from 'react';
import styled from 'styled-components';

const CodeBlockWrapper = styled.div`
  position: relative;
  margin: 1.5rem 0;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: ${props => props.$copied ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$copied ? 'white' : 'var(--color-text-light)'};
  border: 1px solid ${props => props.$copied ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'Pretendard', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: ${props => props.$copied ? 'var(--color-primary-dark)' : 'rgba(255, 255, 255, 0.2)'};
    border-color: ${props => props.$copied ? 'var(--color-primary-dark)' : 'rgba(255, 255, 255, 0.3)'};
  }
`;

const Pre = styled.pre`
  position: relative;
  background-color: #1F2937;
  border-radius: var(--radius);
  padding: 1.5rem;
  padding-top: 3rem;
  overflow-x: auto;
  margin: 0;
  
  code {
    background-color: transparent;
    padding: 0;
    font-size: 0.9rem;
    color: #e5e7eb;
  }
`;

const CodeBlock = ({ children, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const code = children?.props?.children || children || '';
    const textToCopy = typeof code === 'string' ? code : code.toString();
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <CodeBlockWrapper>
      <CopyButton onClick={handleCopy} $copied={copied}>
        {copied ? '복사됨!' : '복사'}
      </CopyButton>
      <Pre className={className}>
        {children}
      </Pre>
    </CodeBlockWrapper>
  );
};

export default CodeBlock;