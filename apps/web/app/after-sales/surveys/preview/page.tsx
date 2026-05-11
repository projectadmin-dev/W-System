"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { Star, Send, CheckCircle2, Smile, Frown, ArrowLeft, ArrowRight } from "lucide-react"

/* ═════════════════ QUESTIONS CONFIG ═════════════════ */

const starQuestions = [
  "Kualitas produk/jasa yang diberikan",
  "Ketepatan waktu pengerjaan",
  "Komunikasi dan responsiveness tim",
  "Kesesuaian dengan kebutuhan",
  "Pelayanan after-sales/support",
]

const textQuestions = [
  "Apa yang kamu suka dari layanan kami?",
  "Apa yang bisa kami tingkatkan?",
  "Kritik, saran, atau masukan lainnya",
]

const STEPS = {
  INTRO: 0,
  STARS: 1,
  YESNO: 2,
  TEXTS: 3,
  DONE: 4,
}

export default function SurveyFormPreviewPage() {
  const [step, setStep] = useState(STEPS.INTRO)
  const [starRatings, setStarRatings] = useState<number[]>([0, 0, 0, 0, 0])
  const [yesNo, setYesNo] = useState<string>("")
  const [textAnswers, setTextAnswers] = useState<string[]>(["", "", ""])
  const [hoverStar, setHoverStar] = useState<number | null>(null)

  const totalStars = starRatings.reduce((a, b) => a + b, 0)
  const canProceedFromStars = starRatings.every(s => s > 0)

  function handleStarClick(questionIdx: number, star: number) {
    const updated = [...starRatings]
    updated[questionIdx] = star
    setStarRatings(updated)
  }

  function handleSubmit() {
    setStep(STEPS.DONE)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-zinc-900 dark:to-zinc-950">

      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <p className="font-semibold text-sm">WIT.ID</p>
              <p className="text-xs text-muted-foreground">Customer Survey</p>
            </div>
          </div>
          {step > STEPS.INTRO && step < STEPS.DONE && (
            <div className="text-xs text-muted-foreground">
              Step {step} / 3
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {step > STEPS.INTRO && step < STEPS.DONE && (
        <div className="bg-white dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-xl mx-auto">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* INTRO */}
        {step === STEPS.INTRO && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smile className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Terima Kasih! 🙏</h1>
            <p className="text-muted-foreground mb-2">
              Kepuasan kamu penting banget buat kami.
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              Ini cuma butuh waktu <strong>1-2 menit</strong>.
            </p>

            {/* Info card */}
            <Card className="text-left mb-8">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3">Survey ini berisi:</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">⭐</span> 5 pertanyaan rating (bintang)
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👍</span> 1 pertanyaan rekomendasi
                  </div>
                  <div className="flex items-center gap-2">
                    <span>💬</span> 3 pertanyaan teks bebas
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" className="w-full" onClick={() => setStep(STEPS.STARS)}>
              Mulai Survey
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* STAR RATINGS */}
        {step === STEPS.STARS && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep(STEPS.INTRO)} className="p-1 hover:bg-muted rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-lg">Rating Layanan</h2>
                <p className="text-sm text-muted-foreground">Berikan rating 1-5 bintang untuk setiap pertanyaan</p>
              </div>
            </div>

            <div className="space-y-5">
              {starQuestions.map((q, qi) => (
                <div key={qi} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-medium mb-3">{qi + 1}. {q}</p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleStarClick(qi, star)}
                        onMouseEnter={() => setHoverStar(qi * 10 + star)}
                        onMouseLeave={() => setHoverStar(null)}
                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoverStar !== null && Math.floor(hoverStar / 10) === qi ? hoverStar % 10 : starRatings[qi])
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-zinc-300 dark:text-zinc-600"
                          }`}
                        />
                      </button>
                    ))}
                    {starRatings[qi] > 0 && (
                      <span className={`ml-2 font-bold text-sm ${
                        starRatings[qi] >= 4 ? "text-green-600" : starRatings[qi] === 3 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {starRatings[qi]}/5
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Overall score preview */}
            {canProceedFromStars && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Rata-rata: <strong>{totalStars}/25</strong> ({ (totalStars / 25 * 5).toFixed(1) } ⭐)
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(STEPS.INTRO)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(STEPS.YESNO)}
                disabled={!canProceedFromStars}
              >
                Lanjut
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* YES / NO / MAYBE */}
        {step === STEPS.YESNO && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep(STEPS.STARS)} className="p-1 hover:bg-muted rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-lg">Rekomendasi</h2>
                <p className="text-sm text-muted-foreground">Apakah kamu akan merekomendasikan WIT ke orang lain?</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { value: "Ya", emoji: "✅", color: "bg-green-50 border-green-200 hover:bg-green-100 text-green-800", selected: "ring-2 ring-green-500 bg-green-50" },
                { value: "Mungkin", emoji: "🤔", color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-800", selected: "ring-2 ring-yellow-500 bg-yellow-50" },
                { value: "Tidak", emoji: "❌", color: "bg-red-50 border-red-200 hover:bg-red-100 text-red-800", selected: "ring-2 ring-red-500 bg-red-50" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setYesNo(opt.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${yesNo === opt.value ? opt.selected : opt.color}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="font-semibold text-base">{opt.value}</span>
                    {yesNo === opt.value && (
                      <CheckCircle2 className="w-5 h-5 ml-auto text-green-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(STEPS.STARS)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(STEPS.TEXTS)}
                disabled={!yesNo}
              >
                Lanjut
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* TEXT ANSWERS */}
        {step === STEPS.TEXTS && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep(STEPS.YESNO)} className="p-1 hover:bg-muted rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-lg">Pendapat Kamu</h2>
                <p className="text-sm text-muted-foreground">Tuliskan pengalaman dan saran kamu</p>
              </div>
            </div>

            <div className="space-y-4">
              {textQuestions.map((q, qi) => (
                <div key={qi}>
                  <Label className="text-sm font-medium mb-2 block">
                    {qi + 1}. {q}
                  </Label>
                  <Textarea
                    placeholder="Tulis jawaban kamu di sini..."
                    className="min-h-[80px] rounded-xl"
                    value={textAnswers[qi]}
                    onChange={e => {
                      const updated = [...textAnswers]
                      updated[qi] = e.target.value
                      setTextAnswers(updated)
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(STEPS.YESNO)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
              >
                <Send className="w-4 h-4 mr-2" />
                Kirim Survey
              </Button>
            </div>
          </div>
        )}

        {/* DONE / THANK YOU */}
        {step === STEPS.DONE && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Terima Kasih! 🎉</h1>
            <p className="text-muted-foreground mb-2">
              Jawaban kamu sudah kami terima.
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              Masukan kamu sangat berarti untuk meningkatkan layanan kami.
            </p>

            <Card className="text-left mb-6">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rata-rata Rating</span>
                  <span className="font-semibold">{(totalStars / 25 * 5).toFixed(1)} ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rekomendasi</span>
                  <span className="font-semibold">{yesNo || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu survey</span>
                  <span className="font-semibold">~1.5 menit</span>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              Feedback kamu akan membantu kami memberikan<br />
              <strong>layanan yang lebih baik</strong> ke depannya 💪
            </p>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground border-t border-zinc-200 dark:border-zinc-800 mt-8">
        <p>© 2026 WIT.ID — PT. Wira Inovasi Teknologi</p>
      </div>

    </div>
  )
}
