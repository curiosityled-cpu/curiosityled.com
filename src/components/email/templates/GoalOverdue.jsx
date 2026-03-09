import React from 'react';

export default function GoalOverdue({ data }) {
  const { userName, goalTitle, dueDate, actionUrl } = data;
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
      <h2 style={{ color: '#bf2600' }}>Action Required: Your Goal is Overdue</h2>
      <p>Hi {userName || 'there'},</p>
      <p>This is a notification that your goal, <strong>"{goalTitle}"</strong>, was due on <strong>{new Date(dueDate).toLocaleDateString()}</strong> and is not yet marked as complete.</p>
      <p>Please take a moment to update your progress. If you're facing challenges, consider discussing them with your manager.</p>
      <a href={actionUrl || '#'} style={{ display: 'inline-block', padding: '10px 15px', backgroundColor: '#bf2600', color: '#fff', textDecoration: 'none', borderRadius: '5px', marginTop: '15px' }}>
        Update Goal Status
      </a>
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#777' }}>
        You're receiving this because you have an overdue goal in Curiosity Led.
      </p>
    </div>
  );
}