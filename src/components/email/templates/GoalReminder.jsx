import React from 'react';

export default function GoalReminder({ data }) {
  const { userName, goalTitle, dueDate, actionUrl } = data;
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
      <h2 style={{ color: '#0052cc' }}>Gentle Reminder: Your Goal Deadline is Approaching</h2>
      <p>Hi {userName || 'there'},</p>
      <p>This is a friendly reminder that your goal, <strong>"{goalTitle}"</strong>, is due on <strong>{new Date(dueDate).toLocaleDateString()}</strong>.</p>
      <p>Keep up the great work! Now is a perfect time to check in, update your progress, and identify any blockers.</p>
      <a href={actionUrl || '#'} style={{ display: 'inline-block', padding: '10px 15px', backgroundColor: '#0052cc', color: '#fff', textDecoration: 'none', borderRadius: '5px', marginTop: '15px' }}>
        Update Your Progress
      </a>
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#777' }}>
        You're receiving this because you have an upcoming goal deadline in Curiosity Led.
      </p>
    </div>
  );
}