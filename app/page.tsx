import { MENU_NAME } from "./lib/types";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 gap-10">

      <div className="text-center space-y-4">
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-gold/50" />
          <div className="absolute inset-2 rounded-full border border-gold/25" />
          <span className="font-display text-gold text-4xl font-light select-none">G</span>
        </div>
        <div>
          <h1 className="font-display text-cream tracking-[0.35em] text-3xl mt-2 font-light">
            {MENU_NAME.toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px bg-gold/45 w-24" />
          <div className="w-1 h-1 bg-gold/60 rotate-45" />
          <div className="h-px bg-gold/45 w-24" />
        </div>
      </div>

      <div className="border border-gold/25 bg-navy-light/60 px-8 py-7 max-w-sm w-full text-center space-y-3">
        <p className="font-display text-gold/80 tracking-[0.25em] text-xs">YOUR BOOKING LINK</p>
        <div className="h-px bg-gold/20" />
        <p className="font-serif italic text-cream/70 text-base leading-relaxed">
          Please use the personalised link sent to you via SMS to access your menu and pre-order.
        </p>
      </div>

      <p className="text-cream/35 text-xs font-display tracking-[0.3em] text-center">
        {MENU_NAME.toUpperCase()}
      </p>
    </div>
  );
}
