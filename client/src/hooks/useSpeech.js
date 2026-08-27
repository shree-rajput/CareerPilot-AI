import { useState, useRef, useEffect, useCallback } from 'react';

export function useSpeech() {
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser. Using MediaRecorder fallback.");
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

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Keep it alive if we are still supposed to be recording
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isRecordingRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  const startRecording = useCallback(async () => {
    window.speechSynthesis.cancel();
    setTranscript('');
    audioChunksRef.current = [];
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.warn("Failed to start speech recognition (might already be started):", e);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("Microphone access denied or unavailable", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      isRecordingRef.current = false;
      setIsRecording(false);
      
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Stop all tracks to release microphone
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
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
