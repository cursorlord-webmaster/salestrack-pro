'use client'

type Props = {
  ownerName: string
  onViewAnalytics: () => void
}

export default function WeeklyBriefingModal({ ownerName, onViewAnalytics }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">Happy new week {ownerName}</h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Your weekly update of your store's business analytics is available. It provides you with weekly professional overview of your store's performance based on last week's sales activities so as to help you make sound decisions to boost your business growth & maximize profit.
            Check your Business Analytics page for fresh updates.
          </p>

          <button
            onClick={onViewAnalytics}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            View My Business Analytics
          </button>
        </div>
      </div>
    </div>
  )
}