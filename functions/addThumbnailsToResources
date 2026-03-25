import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body for batch configuration
        const body = await req.json().catch(() => ({}));
        const batchSize = body.batchSize || 50; // Process 50 resources at a time
        const delayMs = body.delayMs || 2000; // 2 second delay between batches
        const startFrom = body.startFrom || 0; // Resume from a specific index

        // Thumbnail mappings by resource type
        const thumbnailsByType = {
            book: [
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=400&fit=crop",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=400&fit=crop"
            ],
            course: [
                "https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1588072432836-e10032774350?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1552581234-26160f608093?w=300&h=200&fit=crop"
            ],
            video: [
                "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1559223607-a43c990c3b1c?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=200&fit=crop"
            ],
            article: [
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop"
            ],
            podcast: [
                "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=300&h=200&fit=crop"
            ],
            whitepaper: [
                "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1551135049-8a33b5883817?w=300&h=200&fit=crop"
            ],
            assessment_tool: [
                "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&h=200&fit=crop"
            ]
        };

        const defaultThumbnails = [
            "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=200&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
            "https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop"
        ];

        // Helper function to sleep
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Fetch all learning resources
        console.log('Fetching all learning resources...');
        const resources = await base44.asServiceRole.entities.LearningResource.list();
        console.log(`Found ${resources.length} total resources`);
        
        // Filter resources that need thumbnails
        const resourcesNeedingThumbnails = resources.filter(r => !r.thumbnail_url);
        console.log(`${resourcesNeedingThumbnails.length} resources need thumbnails`);

        if (resourcesNeedingThumbnails.length === 0) {
            return Response.json({ 
                success: true,
                message: 'All resources already have thumbnails!',
                total: resources.length,
                updated: 0,
                skipped: resources.length
            });
        }

        // Process starting from specified index
        const resourcesToProcess = resourcesNeedingThumbnails.slice(startFrom);
        let updatedCount = 0;
        let errorCount = 0;

        // Process in batches
        for (let i = 0; i < resourcesToProcess.length; i += batchSize) {
            const batch = resourcesToProcess.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(resourcesToProcess.length / batchSize);
            
            console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} resources)...`);

            // Process batch
            for (const resource of batch) {
                try {
                    const typeThumbnails = thumbnailsByType[resource.type] || defaultThumbnails;
                    const thumbnailIndex = Math.abs(resource.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % typeThumbnails.length;
                    const thumbnail_url = typeThumbnails[thumbnailIndex];

                    await base44.asServiceRole.entities.LearningResource.update(resource.id, {
                        thumbnail_url
                    });

                    updatedCount++;
                } catch (error) {
                    console.error(`Error updating resource ${resource.id}:`, error.message);
                    errorCount++;
                }
            }

            // Add delay between batches (except for the last batch)
            if (i + batchSize < resourcesToProcess.length) {
                console.log(`Waiting ${delayMs}ms before next batch...`);
                await sleep(delayMs);
            }
        }

        const skippedCount = resources.length - resourcesNeedingThumbnails.length;
        
        return Response.json({ 
            success: true,
            message: `Processed ${updatedCount + errorCount} resources in batches of ${batchSize}`,
            updated: updatedCount,
            errors: errorCount,
            skipped: skippedCount,
            total: resources.length,
            batchSize: batchSize,
            resumeFrom: startFrom + resourcesToProcess.length
        });

    } catch (error) {
        console.error('Error adding thumbnails:', error);
        return Response.json({ 
            error: error.message,
            tip: 'Try calling the function again with a smaller batchSize or larger delayMs in the request body'
        }, { status: 500 });
    }
});