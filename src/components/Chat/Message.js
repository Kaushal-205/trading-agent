const Message = ({ role, content }) => {
    const isUser = role === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
          }`}
        >
          <div className="flex items-center mb-1">
            {!isUser && (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                <span className="text-blue-600 text-sm font-bold">A</span>
              </div>
            )}
            <span className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
              {isUser ? 'You' : 'Agent'}
            </span>
          </div>
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    );
  };
  
  export default Message; 