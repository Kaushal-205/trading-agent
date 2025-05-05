const Message = ({ role, content }) => {
    const isUser = role === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm transition-all duration-200 ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none hover:shadow-md'
              : 'bg-white/80 backdrop-blur-sm text-gray-800 rounded-bl-none border border-gray-100 hover:shadow-md'
          }`}
        >
          <div className="flex items-center mb-2">
            {!isUser && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mr-3 shadow-sm">
                <span className="text-blue-600 text-sm font-bold">A</span>
              </div>
            )}
            <span className={`text-xs font-medium ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
              {isUser ? 'You' : 'Agent'}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        </div>
      </div>
    );
  };
  
  export default Message; 