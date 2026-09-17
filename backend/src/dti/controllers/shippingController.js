import { supabase } from '../../db/index.js';

// Mock shipping rates - In production, you'd integrate with real shipping APIs
const SHIPPING_RATES = {
  'North America': { base: 25, per_kg: 5 },
  'South America': { base: 35, per_kg: 7 },
  'West Africa': { base: 30, per_kg: 6 },
  'East Africa': { base: 32, per_kg: 6.5 },
  'North Africa': { base: 28, per_kg: 5.5 },
  'Southern Africa': { base: 34, per_kg: 6.5 },
  'Europe': { base: 20, per_kg: 4 },
  'Asia': { base: 22, per_kg: 4.5 },
  'Oceania': { base: 26, per_kg: 5.5 },
  'Anywhere': { base: 30, per_kg: 6 }
};

const CARRIERS = ['DHL', 'FedEx', 'UPS', 'USPS'];

/**
 * Get shipping estimate
 */
export const getShippingEstimate = async (req, res) => {
  try {
    const { 
      from_country, 
      to_region, 
      weight_kg, 
      length_cm, 
      width_cm, 
      height_cm 
    } = req.query;

    if (!to_region || !weight_kg) {
      return res.status(400).json({
        success: false,
        error: 'Please provide to_region and weight_kg'
      });
    }

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('shipping_quotes')
      .select('*')
      .eq('from_country', from_country || 'USA')
      .eq('to_region', to_region)
      .eq('weight_kg', parseFloat(weight_kg))
      .gte('quoted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within 24 hours
      .order('quoted_at', { ascending: false })
      .limit(1);

    if (!cacheError && cached && cached.length > 0) {
      return res.json({
        success: true,
        estimates: cached[0].estimates || [],
        cached: true
      });
    }

    // Calculate estimates
    const rate = SHIPPING_RATES[to_region] || SHIPPING_RATES['Anywhere'];
    const weight = parseFloat(weight_kg);
    const basePrice = rate.base + (weight * rate.per_kg);
    
    // Add dimension factor if provided
    let dimensionFactor = 1;
    if (length_cm && width_cm && height_cm) {
      const volume = parseFloat(length_cm) * parseFloat(width_cm) * parseFloat(height_cm);
      if (volume > 50000) { // > 50L
        dimensionFactor = 1.5;
      } else if (volume > 20000) { // > 20L
        dimensionFactor = 1.2;
      }
    }

    const estimates = CARRIERS.map((carrier, index) => {
      const multiplier = 1 + (index * 0.05); // Different carriers have different rates
      const price = (basePrice * dimensionFactor * multiplier);
      const days = 3 + (index * 2); // Different delivery times
      
      return {
        carrier,
        price: Math.round(price * 100) / 100,
        currency: 'USD',
        days: `${days}-${days + 2}`,
        logo: 'bi bi-truck'
      };
    });

    // Sort by price
    estimates.sort((a, b) => a.price - b.price);

    // Cache the result
    await supabase
      .from('shipping_quotes')
      .insert({
        from_country: from_country || 'USA',
        to_region,
        weight_kg: weight,
        length_cm: length_cm || null,
        width_cm: width_cm || null,
        height_cm: height_cm || null,
        estimates,
        quoted_at: new Date().toISOString()
      });

    res.json({
      success: true,
      estimates,
      cached: false,
      from: from_country || 'USA',
      to: to_region,
      weight_kg: weight
    });

  } catch (error) {
    console.error('Shipping estimate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate shipping estimate'
    });
  }
};

/**
 * Get cheapest shipping destinations
 */
export const getCheapestDestinations = async (req, res) => {
  try {
    const { from_country, weight_kg, length_cm, width_cm, height_cm } = req.query;

    if (!weight_kg) {
      return res.status(400).json({
        success: false,
        error: 'Please provide weight_kg'
      });
    }

    const weight = parseFloat(weight_kg);
    const destinations = [];

    for (const [region, rate] of Object.entries(SHIPPING_RATES)) {
      const basePrice = rate.base + (weight * rate.per_kg);
      
      // Add dimension factor if provided
      let dimensionFactor = 1;
      if (length_cm && width_cm && height_cm) {
        const volume = parseFloat(length_cm) * parseFloat(width_cm) * parseFloat(height_cm);
        if (volume > 50000) {
          dimensionFactor = 1.5;
        } else if (volume > 20000) {
          dimensionFactor = 1.2;
        }
      }

      const price = Math.round((basePrice * dimensionFactor) * 100) / 100;
      
      destinations.push({
        region,
        price,
        currency: 'USD',
        weight_kg: weight
      });
    }

    // Sort by price
    destinations.sort((a, b) => a.price - b.price);

    res.json({
      success: true,
      from: from_country || 'USA',
      destinations: destinations.slice(0, 10) // Top 10 cheapest
    });

  } catch (error) {
    console.error('Cheapest destinations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate cheapest destinations'
    });
  }
};