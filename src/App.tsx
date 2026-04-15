/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Send, 
  FileText, 
  Palette, 
  Layers, 
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  X
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface GeneratedResult {
  moldInstructions: string;
  artImageUrl: string | null;
}

export default function App() {
  const [description, setDescription] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('');

  const refInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateArt = async () => {
    if (!description && !referenceImage) {
      setError("Por favor, forneça uma descrição ou uma imagem de referência.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingStep("Analisando sua referência e descrição...");

    try {
      // Step 1: Generate Mold Instructions and Design Analysis
      const analysisPrompt = `
        Você é um especialista em design gráfico e criação de moldes (templates).
        O usuário quer criar uma arte baseada na seguinte descrição: "${description}".
        ${referenceImage ? "Analise a imagem de referência enviada para entender o estilo, layout e proporções do 'molde'." : ""}
        ${logoImage ? "O usuário também enviou um logotipo para ser integrado." : ""}

        Por favor, forneça:
        1. Um "Guia de Montagem" detalhado (Molde): Dimensões sugeridas, paleta de cores (HEX), fontes recomendadas e posicionamento dos elementos.
        2. Instruções passo-a-passo para montar a arte final.
        3. Uma análise técnica do estilo visual.

        Responda em Markdown estruturado e em Português.
      `;

      const parts: any[] = [{ text: analysisPrompt }];
      if (referenceImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: referenceImage.split(',')[1]
          }
        });
      }
      if (logoImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: logoImage.split(',')[1]
          }
        });
      }

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
      });

      const moldInstructions = analysisResponse.text || "Não foi possível gerar as instruções.";

      // Step 2: Generate the Visual Art Preview
      setLoadingStep("Renderizando a arte final com IA...");
      
      const imageGenPrompt = `
        A high-quality professional graphic design art. 
        Description: ${description}. 
        Style: Inspired by the uploaded reference image. 
        Context: This is a final production-ready art piece. 
        Include elements like: ${description}.
        Clean, modern, professional aesthetic.
      `;

      const imageParts: any[] = [{ text: imageGenPrompt }];
      if (referenceImage) {
        imageParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: referenceImage.split(',')[1]
          }
        });
      }

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: imageParts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let artImageUrl = null;
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          artImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      setResult({
        moldInstructions,
        artImageUrl
      });
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro ao gerar sua arte. Por favor, tente novamente.");
    } finally {
      setIsGenerating(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-sans text-[#1A1A1A] selection:bg-[#00FF00] selection:text-black">
      {/* Header */}
      <header className="border-b border-black p-6 flex justify-between items-center bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center rounded-sm">
            <Palette className="text-[#00FF00] w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">ArtStudio<span className="text-[#00FF00]">.</span></h1>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest opacity-60">
          <span>Criar</span>
          <span>Moldes</span>
          <span>Galeria</span>
          <span>Sobre</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              <h2 className="font-bold uppercase text-sm tracking-wider">Descrição da Arte</h2>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente como você quer a sua arte... (ex: Convite de aniversário tema Frozen com tons de azul e prata)"
              className="w-full h-32 p-4 border border-black focus:outline-none focus:ring-2 focus:ring-[#00FF00] resize-none bg-[#F9F9F9]"
            />
          </section>

          <section className="bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5" />
              <h2 className="font-bold uppercase text-sm tracking-wider">Imagem de Referência (Molde)</h2>
            </div>
            <div 
              onClick={() => refInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-black p-8 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-[#F0FFF0]",
                referenceImage ? "bg-[#F0FFF0]" : "bg-[#F9F9F9]"
              )}
            >
              <input 
                type="file" 
                ref={refInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setReferenceImage)}
              />
              {referenceImage ? (
                <div className="relative w-full aspect-video">
                  <img src={referenceImage} alt="Reference" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                    className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full hover:bg-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-bold uppercase opacity-60">Clique ou arraste o molde de referência</p>
                </>
              )}
            </div>
          </section>

          <section className="bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5" />
              <h2 className="font-bold uppercase text-sm tracking-wider">Logotipo ou Elementos Extras</h2>
            </div>
            <div 
              onClick={() => logoInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-black p-8 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-[#F0FFF0]",
                logoImage ? "bg-[#F0FFF0]" : "bg-[#F9F9F9]"
              )}
            >
              <input 
                type="file" 
                ref={logoInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setLogoImage)}
              />
              {logoImage ? (
                <div className="relative w-full aspect-square max-w-[150px] mx-auto">
                  <img src={logoImage} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLogoImage(null); }}
                    className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full hover:bg-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Plus className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-bold uppercase opacity-60">Adicionar Logo / Assets</p>
                </>
              )}
            </div>
          </section>

          <button
            onClick={generateArt}
            disabled={isGenerating}
            className={cn(
              "w-full py-6 bg-black text-[#00FF00] font-black uppercase text-xl tracking-tighter shadow-[6px_6px_0px_0px_rgba(0,255,0,0.3)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3",
              isGenerating && "bg-zinc-800"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                Criar Arte e Molde
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-500 p-4 flex items-start gap-3 text-red-700"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center"
              >
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-[#00FF00] rounded-full animate-ping opacity-20"></div>
                  <div className="absolute inset-0 border-4 border-black rounded-full animate-spin border-t-[#00FF00]"></div>
                  <Palette className="absolute inset-0 m-auto w-10 h-10 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-2 tracking-tight">{loadingStep}</h3>
                <p className="text-sm opacity-60 max-w-md">
                  Nossa IA está processando suas imagens e descrições para criar algo único. 
                  Isso pode levar alguns segundos, mas o resultado valerá a pena!
                </p>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Art Preview */}
                <section className="bg-white border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <div className="bg-black text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-[#00FF00] w-5 h-5" />
                      <h2 className="font-bold uppercase text-xs tracking-widest">Arte Gerada</h2>
                    </div>
                    {result.artImageUrl && (
                      <a 
                        href={result.artImageUrl} 
                        download="arte-final.png"
                        className="text-sm font-black uppercase bg-[#00FF00] text-black px-4 py-2 flex items-center gap-2 hover:bg-white transition-all active:scale-95 border border-black"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Arte
                      </a>
                    )}
                  </div>
                  <div className="p-1 bg-zinc-100 border-b border-black">
                    {result.artImageUrl ? (
                      <img 
                        src={result.artImageUrl} 
                        alt="Generated Art" 
                        className="w-full h-auto max-h-[600px] object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-zinc-400 italic">
                        Visualização da arte não disponível
                      </div>
                    )}
                  </div>
                  {result.artImageUrl && (
                    <div className="p-4 bg-white flex justify-center">
                      <a 
                        href={result.artImageUrl} 
                        download="arte-final.png"
                        className="w-full max-w-xs py-4 bg-black text-[#00FF00] font-black uppercase text-center flex items-center justify-center gap-3 hover:bg-zinc-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,255,0,0.3)]"
                      >
                        <Download className="w-5 h-5" />
                        Baixar Imagem em Alta
                      </a>
                    </div>
                  )}
                </section>

                {/* Mold Instructions */}
                <section className="bg-white border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="bg-black text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Info className="text-[#00FF00] w-5 h-5" />
                      <h2 className="font-bold uppercase text-xs tracking-widest">Guia do Molde e Montagem</h2>
                    </div>
                    <button 
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([result.moldInstructions], {type: 'text/plain'});
                        element.href = URL.createObjectURL(file);
                        element.download = "guia-de-montagem.txt";
                        document.body.appendChild(element);
                        element.click();
                      }}
                      className="text-xs font-black uppercase bg-white text-black px-3 py-1 flex items-center gap-2 hover:bg-[#00FF00] transition-colors border border-black"
                    >
                      <Download className="w-3 h-3" />
                      Salvar Guia
                    </button>
                  </div>
                  <div className="p-8 prose prose-zinc max-w-none prose-headings:uppercase prose-headings:tracking-tighter prose-headings:font-black">
                    <ReactMarkdown>{result.moldInstructions}</ReactMarkdown>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-black/20 rounded-lg p-12 text-center"
              >
                <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6">
                  <Palette className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-xl font-bold uppercase opacity-40 mb-2">Aguardando sua criação</h3>
                <p className="text-sm opacity-30 max-w-xs">
                  Preencha as informações ao lado e clique em "Criar Arte" para ver a mágica acontecer.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black p-12 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter mb-2">ArtStudio<span className="text-[#00FF00]">.</span></h2>
            <p className="text-xs opacity-60 uppercase font-bold tracking-widest">© 2026 Design Intelligence Systems</p>
          </div>
          <div className="flex gap-6">
            <div className="w-10 h-10 border border-black flex items-center justify-center hover:bg-[#00FF00] transition-colors cursor-pointer">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 border border-black flex items-center justify-center hover:bg-[#00FF00] transition-colors cursor-pointer">
              <Palette className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 border border-black flex items-center justify-center hover:bg-[#00FF00] transition-colors cursor-pointer">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
