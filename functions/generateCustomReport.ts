
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { report_config, output_format } = await req.json();
        
        if (!report_config || !output_format) {
            return Response.json({ 
                success: false, 
                error: 'Missing report_config or output_format' 
            }, { status: 400 });
        }

        console.log('Generating custom report with config:', report_config);

        // Extract configuration
        const { metrics: metricsConfig, filters, selected_fields } = report_config; // Renamed metrics to metricsConfig to avoid collision
        const hasFieldSelection = selected_fields && selected_fields.length > 0;

        // Fetch data based on filters
        const { users, assessments, goals, assignedLearning, journeyEnrollments } = 
            await fetchFilteredData(base44, user, filters);

        // Calculate metrics
        const calculatedMetrics = calculateMetrics( // metricsConfig is not used here as calculateMetrics computes all standard metrics
            users,
            assessments,
            goals,
            assignedLearning,
            journeyEnrollments
        );

        // Generate output based on format
        let fileBuffer;
        let fileName;
        let contentType;

        if (output_format === 'csv') {
            const csvContent = generateCSV(
                calculatedMetrics,
                users,
                assessments,
                goals,
                assignedLearning,
                journeyEnrollments,
                selected_fields
            );
            fileBuffer = new TextEncoder().encode(csvContent);
            fileName = `custom-report-${Date.now()}.csv`;
            contentType = 'text/csv';
        } else { // Defaults to PDF if output_format is not 'csv' or explicitly 'pdf'
            const pdfBuffer = generatePDF( // Changed from await generatePDF
                calculatedMetrics,
                users,
                assessments,
                goals,
                assignedLearning,
                journeyEnrollments,
                selected_fields,
                filters
            );
            fileBuffer = pdfBuffer;
            fileName = `custom-report-${Date.now()}.pdf`;
            contentType = 'application/pdf';
        }

        // Upload to private storage
        const blob = new Blob([fileBuffer], { type: contentType });
        const file = new File([blob], fileName, { type: contentType });
        
        const uploadResponse = await base44.asServiceRole.integrations.invoke('Core', 'UploadPrivateFile', {
            file: file
        });

        return Response.json({
            success: true,
            file_uri: uploadResponse.file_uri,
            file_name: fileName
        });

    } catch (error) {
        console.error('Error generating custom report:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

// Helper function to fetch and filter data based on user permissions and report filters
async function fetchFilteredData(base44, currentUser, filters) {
    // Fetch ALL data using service role
    const [allUsers, allAssessments, allGoals, allLearning, allJourneys] = await Promise.all([
        base44.asServiceRole.entities.User.list(),
        base44.asServiceRole.entities.Assessment.list(),
        base44.asServiceRole.entities.Goal.list(),
        base44.asServiceRole.entities.AssignedLearning.list(),
        base44.asServiceRole.entities.JourneyEnrollment.list()
    ]);

    // PERMISSION ENFORCEMENT: Filter data based on user's role and client_id
    let authorizedUsers = allUsers;
    
    if (currentUser.app_role !== 'Platform Admin') {
        // Org leaders and below can only see their client's data
        authorizedUsers = allUsers.filter(u => u.client_id === currentUser.client_id);
    }

    const authorizedEmails = new Set(authorizedUsers.map(u => u.email));
    
    // Filter other entities to only include data from authorized users
    let filteredAssessments = allAssessments.filter(a => authorizedEmails.has(a.email));
    let filteredGoals = allGoals.filter(g => authorizedEmails.has(g.user_email));
    let filteredLearning = allLearning.filter(l => authorizedEmails.has(l.user_email));
    let filteredJourneys = allJourneys.filter(j => authorizedEmails.has(j.user_email));
    let filteredUsers = authorizedUsers;

    // Apply report filters
    // Date filter
    if (filters.timeframe && filters.timeframe !== 'all') {
        const now = new Date();
        let cutoffDate;
        
        if (filters.timeframe === 'custom' && filters.customDateRange) {
            cutoffDate = new Date(filters.customDateRange.from);
        } else if (filters.timeframe === '3months') {
            cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (filters.timeframe === '6months') {
            cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        } else if (filters.timeframe === '12months') {
            cutoffDate = new Date(now.setMonth(now.getMonth() - 12));
        }

        if (cutoffDate) {
            filteredAssessments = filteredAssessments.filter(a => new Date(a.created_date) >= cutoffDate);
            filteredGoals = filteredGoals.filter(g => new Date(g.created_date) >= cutoffDate);
            filteredLearning = filteredLearning.filter(l => new Date(l.created_date) >= cutoffDate);
            filteredJourneys = filteredJourneys.filter(j => new Date(j.enrolled_date) >= cutoffDate);
        }
    }

    // Division filter
    if (filters.division && filters.division !== 'all') {
        const divisionUsers = filteredUsers.filter(u => u.department === filters.division);
        const divisionEmails = new Set(divisionUsers.map(u => u.email));
        
        filteredAssessments = filteredAssessments.filter(a => divisionEmails.has(a.email));
        filteredGoals = filteredGoals.filter(g => divisionEmails.has(g.user_email));
        filteredLearning = filteredLearning.filter(l => divisionEmails.has(l.user_email));
        filteredJourneys = filteredJourneys.filter(j => divisionEmails.has(j.user_email)); // FIX: Changed l.user_email to j.user_email
        filteredUsers = divisionUsers;
    }

    // Level filter
    if (filters.level && filters.level !== 'all') {
        const levelUsers = filteredUsers.filter(u => {
            const role = (u.current_role || '').toLowerCase();
            if (filters.level === 'manager') return role.includes('manager') && !role.includes('director');
            if (filters.level === 'director') return role.includes('director');
            if (filters.level === 'vp') return role.includes('vp');
            if (filters.level === 'c-suite') return role.includes('chief') || role.includes('ceo');
            return false;
        });
        const levelEmails = new Set(levelUsers.map(u => u.email));
        
        filteredAssessments = filteredAssessments.filter(a => levelEmails.has(a.email));
        filteredGoals = filteredGoals.filter(g => levelEmails.has(g.user_email));
        filteredLearning = filteredLearning.filter(l => levelEmails.has(l.user_email));
        filteredJourneys = filteredJourneys.filter(j => levelEmails.has(j.user_email));
        filteredUsers = levelUsers;
    }

    // Tenure filter
    if (filters.tenure && filters.tenure !== 'all') {
        const tenureUsers = filteredUsers.filter(u => {
            if (!u.start_date) return false;
            const monthsEmployed = Math.floor((new Date().getTime() - new Date(u.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
            
            if (filters.tenure === '0-6') return monthsEmployed >= 0 && monthsEmployed <= 6;
            if (filters.tenure === '6-12') return monthsEmployed > 6 && monthsEmployed <= 12;
            if (filters.tenure === '1-2') return monthsEmployed > 12 && monthsEmployed <= 24;
            if (filters.tenure === '2-5') return monthsEmployed > 24 && monthsEmployed <= 60;
            if (filters.tenure === '5plus') return monthsEmployed > 60;
            return false;
        });
        const tenureEmails = new Set(tenureUsers.map(u => u.email));
        
        filteredAssessments = filteredAssessments.filter(a => tenureEmails.has(a.email));
        filteredGoals = filteredGoals.filter(g => tenureEmails.has(g.user_email));
        filteredLearning = filteredLearning.filter(l => tenureEmails.has(l.user_email));
        filteredJourneys = filteredJourneys.filter(j => tenureEmails.has(j.user_email));
        filteredUsers = tenureUsers;
    }

    return {
        users: filteredUsers,
        assessments: filteredAssessments,
        goals: filteredGoals,
        assignedLearning: filteredLearning,
        journeyEnrollments: filteredJourneys
    };
}

// Helper function to calculate key leadership metrics
function calculateMetrics(users, assessments, goals, assignedLearning, journeyEnrollments) {
    const metrics = {
        total_leaders: users.length,
        avg_leadership_score: assessments.length > 0
            ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
            : 0,
        goal_completion_rate: goals.length > 0
            ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
            : 0,
        learning_completion_rate: assignedLearning.length > 0
            ? Math.round((assignedLearning.filter(l => l.status === 'completed').length / assignedLearning.length) * 100)
            : 0,
        journey_completion_rate: journeyEnrollments.length > 0
            ? Math.round((journeyEnrollments.filter(j => j.status === 'completed').length / journeyEnrollments.length) * 100)
            : 0,
        at_risk_leaders: assessments.filter(a => (a.overall_pct || 0) < 60).length,
        high_potential_leaders: assessments.filter(a => (a.overall_pct || 0) >= 85).length,
        overdue_goals: goals.filter(g => g.status === 'overdue').length,
        total_assessments: assessments.length,
        total_goals: goals.length,
        total_learning: assignedLearning.length,
        total_journeys: journeyEnrollments.length
    };
    return metrics;
}

// Enhanced CSV generation with field selection
function generateCSV(metrics, users, assessments, goals, assignedLearning, journeyEnrollments, selectedFields) {
    const hasFieldSelection = selectedFields && selectedFields.length > 0;
    
    // If no fields selected, include summary metrics only
    if (!hasFieldSelection) {
        const rows = [['Metric', 'Value']];
        Object.entries(metrics).forEach(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            rows.push([label, value]);
        });
        return rows.map(row => row.join(',')).join('\n');
    }

    // Field selection is active - generate detailed data rows
    const fieldCategories = categorizeSelectedFields(selectedFields);
    const rows = [];
    
    // Generate headers
    const headers = selectedFields.map(fieldId => {
        const parts = fieldId.split('.');
        return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
    rows.push(headers);

    // Generate data rows based on primary entity
    if (fieldCategories.user.length > 0) {
        users.forEach(user => {
            const row = selectedFields.map(fieldId => extractFieldValue(fieldId, { user, assessments, goals, assignedLearning, journeyEnrollments }));
            rows.push(row);
        });
    } else if (fieldCategories.assessment.length > 0) {
        assessments.forEach(assessment => {
            const user = users.find(u => u.email === assessment.email);
            const row = selectedFields.map(fieldId => extractFieldValue(fieldId, { user, assessment, assessments, goals, assignedLearning, journeyEnrollments }));
            rows.push(row);
        });
    } else if (fieldCategories.goal.length > 0) {
        goals.forEach(goal => {
            const user = users.find(u => u.email === goal.user_email);
            const row = selectedFields.map(fieldId => extractFieldValue(fieldId, { user, goal, assessments, goals, assignedLearning, journeyEnrollments }));
            rows.push(row);
        });
    } else if (fieldCategories.learning.length > 0) {
        assignedLearning.forEach(learning => {
            const user = users.find(u => u.email === learning.user_email);
            const row = selectedFields.map(fieldId => extractFieldValue(fieldId, { user, learning, assessments, goals, assignedLearning, journeyEnrollments }));
            rows.push(row);
        });
    } else if (fieldCategories.journey.length > 0) {
        journeyEnrollments.forEach(enrollment => {
            const user = users.find(u => u.email === enrollment.user_email);
            const row = selectedFields.map(fieldId => extractFieldValue(fieldId, { user, enrollment, assessments, goals, assignedLearning, journeyEnrollments }));
            rows.push(row);
        });
    }

    return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// Helper to categorize selected fields by entity
function categorizeSelectedFields(selectedFields) {
    return {
        user: selectedFields.filter(f => f.startsWith('user.')),
        assessment: selectedFields.filter(f => f.startsWith('assessment.')),
        goal: selectedFields.filter(f => f.startsWith('goal.')),
        learning: selectedFields.filter(f => f.startsWith('learning.')),
        journey: selectedFields.filter(f => f.startsWith('journey.'))
    };
}

// Helper to extract field value from data objects
function extractFieldValue(fieldId, data) {
    const parts = fieldId.split('.');
    const entity = parts[0]; // e.g., 'user', 'assessment'
    const field = parts[1];   // e.g., 'full_name', 'overall_pct'

    let value: string | number | Date | null = '';

    if (entity === 'user' && data.user) {
        value = data.user[field] || '';
    } else if (entity === 'assessment') {
        if (data.assessment) {
            value = data.assessment[field] || '';
        } else if (data.assessments && data.user) {
            const userAssessment = data.assessments.find(a => a.email === data.user.email);
            value = userAssessment ? (userAssessment[field] || '') : '';
        }
    } else if (entity === 'goal') {
        if (data.goal) {
            value = data.goal[field] || '';
        } else if (data.goals && data.user) {
            const userGoals = data.goals.filter(g => g.user_email === data.user.email);
            if (userGoals.length > 0) {
                // For CSV, we'll just count or show first goal's data if a specific field is requested
                value = field === 'title' ? `${userGoals.length} goals` : (userGoals[0][field] || '');
            }
        }
    } else if (entity === 'learning') {
        if (data.learning) {
            value = data.learning[field] || '';
        } else if (data.assignedLearning && data.user) {
            const userLearning = data.assignedLearning.filter(l => l.user_email === data.user.email);
            if (userLearning.length > 0) {
                value = field === 'title' ? `${userLearning.length} assignments` : (userLearning[0][field] || '');
            }
        }
    } else if (entity === 'journey') {
        if (data.enrollment) {
            value = data.enrollment[field] || '';
        } else if (data.journeyEnrollments && data.user) {
            const userEnrollments = data.journeyEnrollments.filter(e => e.user_email === data.user.email);
            if (userEnrollments.length > 0) {
                value = userEnrollments[0][field] || '';
            }
        }
    }

    // Format dates and numbers
    if (typeof value === 'number') {
        return value.toFixed(2);
    }
    if (value && (field.includes('date') || field.includes('_ts'))) {
        try {
            return new Date(value).toLocaleDateString();
        } catch {
            return String(value);
        }
    }

    return String(value || 'N/A');
}

// Enhanced PDF generation with field selection - changed to non-async since no await is used
function generatePDF(metrics, users, assessments, goals, assignedLearning, journeyEnrollments, selectedFields, filters) {
    const hasFieldSelection = selectedFields && selectedFields.length > 0;
    
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Custom Leadership Report', 20, yPos);
    yPos += 10;

    // Metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 6;
    doc.text(`Timeframe: ${filters.timeframe === 'all' ? 'All time' : filters.timeframe}`, 20, yPos);
    yPos += 6;
    if (hasFieldSelection) {
        doc.text(`Selected Fields: ${selectedFields.length} fields`, 20, yPos);
        yPos += 10;
    } else {
        doc.text('Report Type: Summary Metrics', 20, yPos);
        yPos += 10;
    }

    // Summary Metrics Section
    doc.setFontSize(14);
    doc.text('Summary Metrics', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    Object.entries(metrics).forEach(([key, value]) => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.text(`${label}: ${value}`, 20, yPos);
        yPos += 6;
    });

    // If field selection is active, add detailed data tables
    if (hasFieldSelection) {
        const fieldCategories = categorizeSelectedFields(selectedFields);
        
        // User data table
        if (fieldCategories.user.length > 0 && users.length > 0) {
            yPos += 10;
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(14);
            doc.text('User Details', 20, yPos);
            yPos += 8;

            doc.setFontSize(9);
            const userFields = fieldCategories.user.map(f => f.split('.')[1]);
            const userHeaders = userFields.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            
            // Simple table (first 20 users to fit on page)
            doc.text(userHeaders.join(' | '), 20, yPos);
            yPos += 6;
            
            users.slice(0, 20).forEach(user => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                const rowData = userFields.map(field => {
                    const value = user[field] || 'N/A';
                    return String(value).substring(0, 15); // Truncate for display
                });
                doc.text(rowData.join(' | '), 20, yPos);
                yPos += 6;
            });

            if (users.length > 20) {
                doc.text(`... and ${users.length - 20} more users`, 20, yPos);
                yPos += 6;
            }
        }

        // Assessment data table
        if (fieldCategories.assessment.length > 0 && assessments.length > 0) {
            yPos += 10;
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(14);
            doc.text('Assessment Details', 20, yPos);
            yPos += 8;

            doc.setFontSize(9);
            const assessmentFields = fieldCategories.assessment.map(f => f.split('.')[1]);
            const assessmentHeaders = assessmentFields.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            
            doc.text(assessmentHeaders.join(' | '), 20, yPos);
            yPos += 6;
            
            assessments.slice(0, 20).forEach(assessment => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                const rowData = assessmentFields.map(field => {
                    const value = assessment[field] || 'N/A';
                    return String(value).substring(0, 15); // Truncate for display
                });
                doc.text(rowData.join(' | '), 20, yPos);
                yPos += 6;
            });

            if (assessments.length > 20) {
                doc.text(`... and ${assessments.length - 20} more assessments`, 20, yPos);
                yPos += 6;
            }
        }
    }

    return doc.output('arraybuffer');
}
