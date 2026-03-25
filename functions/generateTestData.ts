import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { user_count = 10, include_transactions = true } = await req.json();

    const createdData = {
      users: [],
      achievements: [],
      transactions: []
    };

    // Generate test users with achievements
    for (let i = 0; i < user_count; i++) {
      const testEmail = `test-user-${Date.now()}-${i}@example.com`;
      
      // Create achievement record
      const points = Math.floor(Math.random() * 5000) + 100;
      
      // Calculate level based on points
      let level = 1;
      let levelName = 'Beginner';
      if (points >= 5000) {
        level = 5;
        levelName = 'Expert';
      } else if (points >= 2500) {
        level = 4;
        levelName = 'Advanced';
      } else if (points >= 1000) {
        level = 3;
        levelName = 'Intermediate';
      } else if (points >= 500) {
        level = 2;
        levelName = 'Novice';
      }

      const achievement = await base44.asServiceRole.entities.UserAchievement.create({
        user_email: testEmail,
        client_id: user.client_id,
        total_points: points,
        current_level: level,
        level_name: levelName,
        current_streak: Math.floor(Math.random() * 30),
        longest_streak: Math.floor(Math.random() * 60)
      });

      createdData.achievements.push(achievement.id);

      // Create some transactions
      if (include_transactions) {
        const transactionCount = Math.floor(Math.random() * 10) + 3;
        
        for (let j = 0; j < transactionCount; j++) {
          const transaction = await base44.asServiceRole.entities.PointTransaction.create({
            user_email: testEmail,
            client_id: user.client_id,
            transaction_type: ['completion', 'recognition', 'system_award'][Math.floor(Math.random() * 3)],
            points_amount: Math.floor(Math.random() * 200) + 50,
            reason: `Test transaction ${j}`,
            transaction_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          });

          createdData.transactions.push(transaction.id);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Generated ${user_count} test users with achievements and transactions`,
      created_data: {
        achievement_count: createdData.achievements.length,
        transaction_count: createdData.transactions.length
      },
      cleanup_note: 'Run cleanupTestData to remove generated data'
    });

  } catch (error) {
    console.error('Test data generation error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});