
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HotelDataRow {
  category: string;
  item_name: string;
  base_price: number;
  negotiation_margin_percent: number;
  final_negotiation_limit: number;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: hotelData } = await req.json();
    
    console.log(`Processing ${hotelData.length} hotel information records`);

    // Validate and process hotel data
    const processedData: HotelDataRow[] = hotelData.map((row: any) => ({
      category: row.category || 'Uncategorized',
      item_name: row.item_name || row.itemName || 'Unknown Item',
      base_price: parseFloat(row.base_price || row.basePrice || '0'),
      negotiation_margin_percent: parseFloat(row.negotiation_margin_percent || row.negotiationMargin || '0'),
      final_negotiation_limit: parseFloat(row.final_negotiation_limit || row.finalLimit || '0'),
      description: row.description || '',
    }));

    // Insert data into hotel_information table
    const { data: insertedData, error: insertError } = await supabase
      .from('hotel_information')
      .insert(processedData.map(item => ({
        ...item,
        uploaded_by: 'admin',
        is_active: true
      })));

    if (insertError) {
      console.error('Error inserting hotel data:', insertError);
      throw insertError;
    }

    console.log(`Successfully imported ${processedData.length} hotel information records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedData.length} hotel information records`,
        records_imported: processedData.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing hotel data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
