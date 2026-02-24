type OpenAIRequest = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
};

export const requestOpenAI = async ({ apiKey, model, systemPrompt, userPrompt, imageBase64 }: OpenAIRequest) => {
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: imageBase64
        ? [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ]
        : userPrompt,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 请求失败: ${errorText}`);
  }
  const payload = await response.json();
  return payload.choices?.[0]?.message?.content ?? "";
};

export const requestOpenAIModels = async (apiKey: string): Promise<string[]> => {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 请求失败: ${errorText}`);
  }

  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  const models = Array.isArray(payload.data)
    ? payload.data
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return Array.from(new Set(models)).sort();
};
