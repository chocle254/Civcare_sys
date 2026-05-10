export default function ChatBubble({ message }) {
  const isPatient = message.role === 'patient';

  return (
    <div
      style={{
        alignSelf:    isPatient ? 'flex-end' : 'flex-start',
        maxWidth:     '78%',
        display:      'flex',
        flexDirection: 'column',
        gap:          4,
      }}
    >
      {!isPatient && (
        <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 4 }}>
          CivTech AI
        </span>
      )}
      <div className={`bubble ${isPatient ? 'bubble--patient' : 'bubble--ai'}`}>
        {message.content}
      </div>
      {message.timestamp && (
        <span
          style={{
            fontSize:  10,
            color:     'var(--gray-400)',
            alignSelf: isPatient ? 'flex-end' : 'flex-start',
            marginTop: 2,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString('en-KE', {
            hour:   '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </div>
  );
}
