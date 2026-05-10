import { useState } from 'react';

const LABELS = {
  1: 'Very inaccurate',
  2: 'Mostly inaccurate',
  3: 'Partially accurate',
  4: 'Mostly accurate',
  5: 'Very accurate',
};

export default function StarRating({ value, onChange, showLabel = true }) {
  const [hover, setHover] = useState(0);

  return (
    <div>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= (hover || value) ? 'filled' : ''}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </span>
        ))}
      </div>
      {showLabel && (hover || value) > 0 && (
        <p
          style={{
            fontSize:   13,
            color:      'var(--blue)',
            fontWeight: 600,
            marginTop:  8,
          }}
        >
          {LABELS[hover || value]}
        </p>
      )}
    </div>
  );
}
