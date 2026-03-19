
export const ai = {
    async chat(messages: any[], options?: any) {
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
            return res.body; 
        }
        const data = await res.json();
        return data.message.content; 
    },

    async txt2speech(text: string, options?: any) {
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
};
