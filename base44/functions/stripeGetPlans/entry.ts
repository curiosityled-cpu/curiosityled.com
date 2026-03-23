import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all products and prices
    const products = await stripe.products.list({ active: true, limit: 100 });
    
    const plansWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true
        });

        return {
          product_id: product.id,
          name: product.name,
          description: product.description,
          images: product.images,
          prices: prices.data.map(price => ({
            price_id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
            type: price.type
          }))
        };
      })
    );

    // Filter plans based on user role if needed
    let filteredPlans = plansWithPrices;
    
    // Platform Admin and Super Admin see all plans
    // Regular users might see filtered plans (implement if needed)
    
    return Response.json({
      success: true,
      plans: filteredPlans
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});