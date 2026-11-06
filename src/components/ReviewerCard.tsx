import type { Review } from '../lib/tradeReviewer';

export default function ReviewerCard({ review }: { review: Review | null }) {
  if (!review) {
    return (
      <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: 0, color: '#fff' }}>🧠 AI Reviewer (AI ke-7)</h3>
        <p style={{ color: '#9ca3af', marginTop: 8 }}>Belum ada trade yang di-review...</p>
      </div>
    );
  }

  const color = review.bias > 0 ? '#22c55e' : review.bias < 0 ? '#ef4444' : '#eab308';

  return (
    <div style={{ background: '#111827', border: `1px solid ${color}`, borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: 0, color: '#fff' }}>🧠 AI Reviewer (AI ke-7)</h3>
      <p style={{ color: '#d1d5db', marginTop: 8, fontSize: 14 }}>{review.lesson}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ background: color, color: '#000', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          {review.pattern}
        </span>
        <span style={{ background: '#1f2937', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>
          Winrate 20 Terakhir: {review.winRateLast20.toFixed(0)}%
        </span>
        <span style={{ background: '#1f2937', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>
          Bias: {review.bias > 0 ? '+' : ''}{review.bias}
        </span>
      </div>
    </div>
  );
    }
