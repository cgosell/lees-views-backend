
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
	"Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

async function uploadPhoto(supabaseClient, file, caption) {
	const { data, error } = await supabaseClient.storage
		.from("photos")
		.upload(`public/${file.name}`, file.stream(), {
			cacheControl: "3600",
			upsert: false,
		});

	if (error) throw error;

	if (!caption) {
		return { data };
	}

	const { data: captionData, error: captionError } = await supabaseClient
		.from("photo_captions")
		.insert([{ photo_name: file.name, caption }]);

	if (captionError) throw captionError;

	return { data, captionData };
}

Deno.serve(async (req) => {
	const { method } = req;

	if (method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL"),
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
		);

		if (method === "POST") {
			const formData = await req.formData();
			const file = formData.get("file");
			const caption = formData.get("caption");

			if (!file) {
				return new Response("No files were uploaded.", {
					status: 400,
					headers: corsHeaders,
				});
			}

			const { data, captionData } = await uploadPhoto(
				supabaseClient,
				file,
				caption
			);

			return new Response(JSON.stringify({ data, captionData }), {
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
