import { useState, useRef, useEffect, useCallback } from 'react';

export function useSpeech() {
  const recognitionRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  const startRecording = useCallback(() => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const speakText = useCallback((text) => {
    if (!text || !text.trim()) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const speak = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;

      const preferredVoiceNames = [
        "Google UK English Female", "Google US English",
        "Microsoft Jenny Online", "Microsoft Aria Online",
        "Microsoft Jenny", "Microsoft Aria", "Microsoft Guy Online",
        "Microsoft David", "Natural", "Google",
      ];

      let selectedVoice = null;
      for (const preferred of preferredVoiceNames) {
        selectedVoice = voices.find((voice) =>
          voice.name.toLowerCase().includes(preferred.toLowerCase()),
        );
        if (selectedVoice) break;
      }

      if (!selectedVoice) {
        selectedVoice = voices.find((voice) =>
          voice.lang.startsWith("en")
        );
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = "en-US";
      }

      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => synth.cancel();
      utterance.onerror = (event) => console.error("Speech synthesis error:", event);

      synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", speak, { once: true });
    } else {
      speak();
    }
  }, []);

  return {
    transcript,
    setTranscript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
    speakText,
  };
}
