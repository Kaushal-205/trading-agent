import { useState, useEffect, useRef } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import { useWallet } from '@solana/wallet-adapter-react';

const ChatInterface = () => {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add initial system message based on wallet connection status
    if (!publicKey) {
      setMessages([
        {
          role: 'assistant',
          content: 'Please connect your wallet to get started.'
        }
      ]);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: 'I can help you with:\n\n' +
                   '=> Trading Tokens on Solana \n' +
                   '=> Checking Token Prices \n' +
                   '=> Viewing your Portfolio'
        }
      ]);
    }
  }, [publicKey]);

  const handleSendMessage = async (message) => {
    if (!publicKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Please connect your wallet first.' }]);
      return;
    }

    const newMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          publicKey: publicKey.toString(),
          context: messages.slice(-5)
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        // Simulate typing effect
        await new Promise(resolve => setTimeout(resolve, 500));
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <Message key={index} role={message.role} content={message.content} />
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
            </div>
            <span className="text-sm text-gray-500 ml-2 font-medium">Agent is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-100 p-4 bg-white/50 backdrop-blur-sm">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatInterface; 