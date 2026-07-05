import OpenAI from "openai";
import { manufacturers } from "../../../data/festival-of-speed";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const carList = manufacturers.flatMap((manufacturer) =>
  manufacturer.cars.map((car) => `${manufacturer.name} ${car}`)
);

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const prompt = `
Identify the car in this image.

Only choose from this list:
${carList.join("\n")}

Return only JSON:
{"match":"Ferrari F40","confidence":"high","reason":"short reason"}

If unsure:
{"match":null,"confidence":"low","reason":"Not enough detail"}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";

    const clean = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return Response.json(JSON.parse(clean));
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to identify car" },
      { status: 500 }
    );
  }
}