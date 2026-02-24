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
