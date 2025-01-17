import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

async function retrievePhotos(supabaseClient) {
    const { data, error } = await supabaseClient.storage.from("photos").list("public", {
    });
    if (error) throw error;

    const { data: captions, error: captionError } = await supabaseClient
        .from("photo_captions")
        .select("*");

   
	const photos = data.map((photo) => {
		const caption = captions.find(
			(caption) => caption.photo_name === photo.name
		);
		return {
			id: photo.id,
			name: photo.name,
			url: photo.url,
			caption: caption?.caption || "",
		};
	});

    return photos;
}

Deno.serve(async (req) => {
    const { method } = req;

    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Supabase URL and Service Role Key must be set in environment variables.");
        }

        const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        if (method === "GET") {
            
            const data = await retrievePhotos(supabaseClient);

            return new Response(JSON.stringify({ data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        return new Response("Method not allowed", {
            status: 405,
            headers: corsHeaders,
        });
    } catch (error) {
        console.error(error);

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});