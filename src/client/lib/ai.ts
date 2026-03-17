const provider = import.meta.env.VITE_PROVIDER || 'puter';

export const ai = {
    async chat(messages: any[], options?: any) {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ messages, options })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to generate AI response');
            }
            if (options?.stream) {
                return res.body; // Provide actual stream parsing downstream if needed
            }
            const data = await res.json();
            return data.message.content; // Normalizing to just return string content for frontend simplicity
        }
        return await window.puter.ai.chat(messages, options);
    },

    async txt2speech(text: string, options?: any) {
        if (provider === 'supabase') {
            return new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance(text);
                if (options?.voice) {
                    const voices = window.speechSynthesis.getVoices();
                    const selected = voices.find(v => v.name === options.voice);
                    if (selected) utterance.voice = selected;
                }
                utterance.onend = () => resolve(true);
                window.speechSynthesis.speak(utterance);
            });
        }
        return await window.puter.ai.txt2speech(text, options);
    }
};
