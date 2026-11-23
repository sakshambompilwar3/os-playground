import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { Play, Pause, StepForward, RotateCcw, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateProducerConsumer, type ProducerConsumerResult } from "@/lib/labs/producerConsumer";
import { PROCESS_PALETTE } from "@/lib/palette";

export const Route = createFileRoute("/labs/producer-consumer")({
  head: () => ({
    meta: [
      { title: "Producer-Consumer Lab | OS Playground" },
      {
        name: "description",
        content: "Watch a producer and consumer share a bounded buffer with semaphores, gauges, and live rates.",
      },
      { property: "og:title", content: "Producer-Consumer Lab | OS Playground" },
      {
        property: "og:description",
        content: "Watch a producer and consumer share a bounded buffer with semaphores, gauges, and live rates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProducerConsumerLabPage,
});

const SPEEDS = [0.5, 1, 2, 4] as const;

function ProducerConsumerLabPage() {
  // Input parameters
  const [bufferSizeStr, setBufferSizeStr] = useState("3");
  const [producerPeriodStr, setProducerPeriodStr] = useState("1");
  const [consumerPeriodStr, setConsumerPeriodStr] = useState("2");
  const [ticksStr, setTicksStr] = useState("40");

  const [bufferSize, setBufferSize] = useState(3);
  const [producerPeriod, setProducerPeriod] = useState(1);
  const [consumerPeriod, setConsumerPeriod] = useState(2);
  const [ticks, setTicks] = useState(40);

  // Playback state
  const [currentTick, setCurrentTick] = useState(0); // 0 = start (not ticked yet), 1..totalTicks
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);

  // Live validation
  const nVal = Number(bufferSizeStr);
  const pVal = Number(producerPeriodStr);
  const cVal = Number(consumerPeriodStr);
  const tVal = Number(ticksStr);

  const isValid =
    !isNaN(nVal) && nVal >= 1 && nVal <= 8 &&
    !isNaN(pVal) && pVal >= 1 && pVal <= 10 &&
    !isNaN(cVal) && cVal >= 1 && cVal <= 10 &&
    !isNaN(tVal) && tVal >= 1 && tVal <= 200;

  // Run simulation whenever validated parameters change
  const simResult: ProducerConsumerResult | null = useMemo(() => {
    if (!isValid) return null;
    return simulateProducerConsumer({
      bufferSize,
      producerPeriod,
      consumerPeriod,
      ticks,
    });
  }, [bufferSize, producerPeriod, consumerPeriod, ticks, isValid]);

  const resetRun = () => {
    setPlaying(false);
    setCurrentTick(0);
  };

  const handleApply = () => {
    if (!isValid) return;
    setBufferSize(Math.floor(nVal));
    setProducerPeriod(Math.floor(pVal));
    setConsumerPeriod(Math.floor(cVal));
    setTicks(Math.floor(tVal));
    resetRun();
  };

  const handleLoadExample = () => {
    setBufferSizeStr("3");
    setProducerPeriodStr("1");
    setConsumerPeriodStr("2");
    setTicksStr("40");
    setBufferSize(3);
    setProducerPeriod(1);
    setConsumerPeriod(2);
    setTicks(40);
    resetRun();
  };

  // Playback timer
  useEffect(() => {
    if (!playing || !simResult) return;
    if (currentTick >= simResult.totals.ticks) {
      setPlaying(false);
      return;
    }
    const delay = Math.round(700 / speed);
    const timer = setTimeout(() => {
      setCurrentTick((t) => {
        if (t + 1 >= simResult.totals.ticks) {
          setPlaying(false);
          return simResult.totals.ticks;
        }
        return t + 1;
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [playing, currentTick, simResult, speed]);

  const handleStep = () => {
    if (!simResult) return;
    setPlaying(false);
    if (currentTick < simResult.totals.ticks) {
      setCurrentTick((t) => t + 1);
    }
  };

  // Current tick snapshot
  const activeLog = simResult && currentTick > 0 ? simResult.logs[currentTick - 1] : null;
  const currentBuffer = activeLog ? activeLog.buffer : [];
  const currentOccupancy = currentBuffer.length;
  const currentEmptySlots = bufferSize - currentOccupancy;
  const currentFullSlots = currentOccupancy;

  const currentProducerState = activeLog ? activeLog.producerState : "resting";
  const currentConsumerState = activeLog ? activeLog.consumerState : "resting";

  const isFinished = simResult ? currentTick >= simResult.totals.ticks : false;

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link to="/labs" className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:underline">
          ← back to Labs
        </Link>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          OPERATING SYSTEMS · LABS
        </p>
        <h1 className="mt-1 font-hand text-5xl md:text-6xl font-bold">Producer-Consumer Lab</h1>
        <p className="mt-1 text-muted-foreground">
          Fill and empty a bounded buffer: observe full and empty semaphores, blocked states, and throughput.
        </p>
      </div>

      {/* Collapsible "What is this lab about?" */}
      <div className="paper-card overflow-hidden">
        <button
          type="button"
          onClick={() => setTheoryOpen(!theoryOpen)}
          aria-expanded={theoryOpen}
          className="flex w-full min-h-[44px] items-center justify-between p-4 text-left font-hand text-2xl font-bold hover:bg-highlight/20 transition-colors"
        >
          <span>What is this lab about?</span>
          {theoryOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {theoryOpen && (
          <div className="border-t border-rule/50 bg-paper/50 p-5 text-sm leading-relaxed space-y-4 font-sans">
            <div className="space-y-2">
              <p className="font-bold text-foreground font-mono text-xs uppercase tracking-wider">
                1. The Bounded-Buffer (Producer-Consumer) Problem
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                A classic multi-process synchronization problem where one or more <b>producers</b> generate data items and place them into a shared buffer of finite capacity <b>N</b>, while one or more <b>consumers</b> remove and process items from the buffer.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li><b>Buffer Full:</b> If all N slots are occupied, the producer must block and wait until a consumer removes an item and frees a slot.</li>
                <li><b>Buffer Empty:</b> If 0 slots are occupied, the consumer must block and wait until a producer adds a new item.</li>
              </ul>
            </div>

            <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
              <p className="font-bold text-foreground font-mono text-xs uppercase">
                2. Synchronization with Three Semaphores
              </p>
              <div className="grid gap-2 sm:grid-cols-3 font-mono text-xs">
                <div className="rounded border border-primary/20 bg-primary/5 p-2">
                  <span className="font-bold text-primary">empty = N</span>
                  <p className="text-[11px] text-muted-foreground">Counting semaphore: tracks number of vacant buffer slots.</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 p-2">
                  <span className="font-bold text-primary">full = 0</span>
                  <p className="text-[11px] text-muted-foreground">Counting semaphore: tracks number of filled buffer slots.</p>
                </div>
                <div className="rounded border border-primary/20 bg-primary/5 p-2">
                  <span className="font-bold text-primary">mutex = 1</span>
                  <p className="text-[11px] text-muted-foreground">Binary semaphore: ensures mutual exclusion during buffer modification.</p>
                </div>
              </div>
            </div>

            <div className="rounded border-2 border-foreground/20 bg-paper p-3.5 space-y-3 font-mono text-xs">
              <p className="font-bold text-foreground uppercase">3. Standard Synchronization Code</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-foreground/15 bg-background/90 p-3 space-y-1">
                  <p className="font-bold text-primary">// Producer Process</p>
                  <p>wait(empty);  <span className="text-muted-foreground">// decrement empty slot</span></p>
                  <p>wait(mutex);  <span className="text-muted-foreground">// enter critical section</span></p>
                  <p className="text-success font-bold">/* add item to buffer */</p>
                  <p>signal(mutex); <span className="text-muted-foreground">// exit critical section</span></p>
                  <p>signal(full);  <span className="text-muted-foreground">// notify consumer of new item</span></p>
                </div>

                <div className="rounded border border-foreground/15 bg-background/90 p-3 space-y-1">
                  <p className="font-bold text-primary">// Consumer Process</p>
                  <p>wait(full);   <span className="text-muted-foreground">// decrement filled slot</span></p>
                  <p>wait(mutex);  <span className="text-muted-foreground">// enter critical section</span></p>
                  <p className="text-success font-bold">/* remove item from buffer */</p>
                  <p>signal(mutex); <span className="text-muted-foreground">// exit critical section</span></p>
                  <p>signal(empty); <span className="text-muted-foreground">// notify producer of free slot</span></p>
                </div>
              </div>
            </div>

            <div className="rounded border-2 border-destructive/30 bg-destructive/5 p-3.5 space-y-2 text-xs">
              <p className="font-bold text-destructive font-mono uppercase">
                ★ Crucial Rule: Counting Semaphore First, Then Mutex!
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Swapping the wait order causes catastrophic <b>deadlock</b>! Suppose the buffer is completely full (<code className="font-mono text-foreground font-bold">empty = 0</code>). If the producer executes <code className="font-mono text-foreground font-bold">wait(mutex)</code> first, it successfully locks the mutex. It then executes <code className="font-mono text-foreground font-bold">wait(empty)</code> and blocks because no slots are free.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                When the consumer attempts to run, it immediately blocks on <code className="font-mono text-foreground font-bold">wait(mutex)</code> because the producer is holding the lock. The consumer cannot proceed to consume an item and signal empty, while the producer cannot release the mutex until empty is signaled → <b>Deadlock</b>! The exact same deadlock occurs if the consumer executes <code className="font-mono text-foreground font-bold">wait(mutex)</code> first when the buffer is empty (<code className="font-mono text-foreground font-bold">full = 0</code>).
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
                <span className="font-bold text-foreground font-mono uppercase">Concurrency Hazards Prevented:</span>
                <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                  <li><b>Race Condition:</b> Producer and consumer modifying pointers simultaneously.</li>
                  <li><b>Lost Update:</b> Two items written into the same slot, overwriting data.</li>
                  <li><b>Buffer Overflow:</b> Producer writing beyond buffer boundary N.</li>
                  <li><b>Buffer Underflow:</b> Consumer reading uninitialized or stale memory.</li>
                </ul>
              </div>

              <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
                <span className="font-bold text-foreground font-mono uppercase">Real-World Examples:</span>
                <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                  <li><b>Print Spooler:</b> User apps produce print jobs; printer daemon consumes them.</li>
                  <li><b>Keyboard Buffer:</b> Hardware interrupt handler produces scan codes; OS shell consumes keys.</li>
                  <li><b>Video Streaming:</b> Network thread produces decoded frames; display renderer consumes them.</li>
                  <li><b>Web Server:</b> Listener thread produces HTTP socket connections; worker threads consume them.</li>
                </ul>
              </div>
            </div>

            {/* Semaphores in a Nutshell */}
            <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-2 text-xs">
              <p className="font-bold text-primary font-mono uppercase tracking-wider">
                Semaphores in a Nutshell
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground leading-relaxed">
                <li>
                  <b>Definition:</b> An integer variable accessed solely through two standard atomic operations: <code className="font-mono text-foreground font-bold">wait()</code> (originally P / down: decrements, blocks if ≤ 0) and <code className="font-mono text-foreground font-bold">signal()</code> (originally V / up: increments and awakens a waiting process).
                </li>
                <li>
                  <b>Software synchronization tool:</b> Introduced by Edsger Dijkstra to solve mutual exclusion and coordination without ad-hoc flag variables.
                </li>
                <li>
                  <b>Counting vs Binary:</b> Counting semaphores have an unrestricted integer domain used for resource counting. Binary semaphores take only values 0 and 1, functioning identically to mutual exclusion locks (mutexes).
                </li>
                <li>
                  <b>Busy-Waiting vs Blocking Queue:</b> Basic semaphores loop in spinlocks (wasting CPU cycles). Operating systems implement <b>blocking semaphores</b> where a blocked process suspends itself, enters a semaphore wait queue, yields the CPU to other tasks, and is awakened by the OS dispatcher upon <code className="font-mono text-foreground">signal()</code>.
                </li>
                <li>
                  <b>Hazards:</b> Deadlock (cyclic wait), Starvation (indefinite blocking in queue), and <b>Priority Inversion</b> (a high-priority process blocked waiting for a lock held by a low-priority process, solved by the Priority Inheritance Protocol).
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Parameters */}
      <div className="paper-card p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Buffer Size N (1–8)</span>
            <input
              type="number"
              min={1}
              max={8}
              value={bufferSizeStr}
              onChange={(e) => {
                setBufferSizeStr(e.target.value);
                const n = Number(e.target.value);
                if (n >= 1 && n <= 8) {
                  setBufferSize(n);
                  resetRun();
                }
              }}
              className="w-24 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Producer Period P (1–10 ticks)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={producerPeriodStr}
              onChange={(e) => {
                setProducerPeriodStr(e.target.value);
                const p = Number(e.target.value);
                if (p >= 1 && p <= 10) {
                  setProducerPeriod(p);
                  resetRun();
                }
              }}
              className="w-24 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Consumer Period C (1–10 ticks)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={consumerPeriodStr}
              onChange={(e) => {
                setConsumerPeriodStr(e.target.value);
                const c = Number(e.target.value);
                if (c >= 1 && c <= 10) {
                  setConsumerPeriod(c);
                  resetRun();
                }
              }}
              className="w-24 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Ticks to Run (1–200)</span>
            <input
              type="number"
              min={1}
              max={200}
              value={ticksStr}
              onChange={(e) => {
                setTicksStr(e.target.value);
                const t = Number(e.target.value);
                if (t >= 1 && t <= 200) {
                  setTicks(t);
                  resetRun();
                }
              }}
              className="w-28 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <Button variant="outline" onClick={handleApply} disabled={!isValid}>
            Apply
          </Button>

          <Button variant="outline" onClick={handleLoadExample}>
            Load example (N=3, P=1, C=2)
          </Button>
        </div>

        {!isValid && (
          <p className="font-mono text-xs text-destructive">
            Please enter valid integers: N (1–8), P (1–10), C (1–10), ticks (1–200).
          </p>
        )}
      </div>

      {/* Chalkboard Stage with Control Bar, Visual Buffer, and Narration */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Chalkboard Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid || !simResult}
            onClick={() => {
              if (isFinished) {
                resetRun();
                setPlaying(true);
              } else {
                setPlaying(!playing);
              }
            }}
            className="bg-highlight text-foreground font-bold"
          >
            {playing ? <Pause className="h-4 w-4" /> : isFinished ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : isFinished ? "Replay" : "Play"}
          </Button>

          <Button
            variant="outline"
            onClick={handleStep}
            disabled={!isValid || isFinished || !simResult}
          >
            <StepForward className="h-4 w-4" />
            Step
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setPlaying(false);
              setCalculationsOpen(true);
            }}
          >
            <Calculator className="h-4 w-4" />
            Calculations
          </Button>

          <Button variant="outline" onClick={resetRun}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 rounded border border-chalk-foreground/30 bg-black/20 p-1 font-mono text-xs text-chalk-foreground">
            <span className="px-1 text-chalk-muted">Speed:</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`min-h-[28px] min-w-[28px] rounded px-1.5 py-0.5 transition-colors ${
                  speed === s ? "bg-chalk-foreground text-chalk font-bold" : "hover:bg-white/10"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="ml-auto font-mono text-sm text-chalk-foreground">
            Tick: <span className="font-bold text-chalk-yellow">{currentTick}</span> / {ticks}
          </div>
        </div>

        {/* Visual Stage: Producer | Buffer Slots | Consumer */}
        <div className="rounded-md border border-chalk-foreground/20 bg-black/25 p-6">
          <div className="grid gap-6 md:grid-cols-[180px_1fr_180px] items-center">
            {/* Producer Box */}
            <div className={`rounded-lg border-2 p-4 text-center transition-all ${
              currentProducerState === "working"
                ? "border-chalk-yellow bg-highlight/30 text-chalk-foreground shadow-[0_0_12px_rgba(245,223,116,0.3)]"
                : currentProducerState === "waiting"
                ? "border-destructive bg-destructive/20 text-chalk-foreground"
                : "border-chalk-foreground/30 bg-white/5 text-chalk-muted"
            }`}>
              <span className="font-mono text-xs uppercase tracking-wider block">PRODUCER</span>
              <span className="font-hand text-2xl font-bold block mt-1">
                {currentProducerState === "working" ? "Working" : currentProducerState === "waiting" ? "Waiting (Full)" : "Resting"}
              </span>
              <span className={`font-mono text-xs mt-2 block ${currentProducerState === "working" ? "text-chalk-foreground font-semibold" : "text-chalk-muted"}`}>
                Period P = {producerPeriod} tick{producerPeriod > 1 ? "s" : ""}
              </span>
              {activeLog?.producedItem && currentProducerState === "working" && (
                <span className="mt-2 inline-block rounded bg-highlight text-foreground px-2 py-0.5 font-mono text-xs font-bold">
                  + Item {activeLog.producedItem}
                </span>
              )}
            </div>

            {/* Bounded Buffer Slots */}
            <div className="space-y-4">
              <div className="text-center font-hand text-2xl font-bold text-chalk-foreground">
                Shared Bounded Buffer ({currentOccupancy} / {bufferSize} slots)
              </div>

              {/* Buffer Slots Row */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {Array.from({ length: bufferSize }).map((_, slotIdx) => {
                  const item = currentBuffer[slotIdx];
                  const hasItem = item !== undefined;
                  const color = hasItem ? PROCESS_PALETTE[(item - 1) % PROCESS_PALETTE.length] : null;

                  return (
                    <div
                      key={slotIdx}
                      className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 transition-all ${
                        hasItem
                          ? "border-chalk-foreground shadow-md scale-100"
                          : "border-dashed border-chalk-foreground/40 bg-white/5"
                      }`}
                      style={{
                        backgroundColor: color ? color.bg : undefined,
                        color: color ? color.ink : undefined,
                      }}
                    >
                      {hasItem ? (
                        <span className="font-mono text-xl font-bold">
                          {item}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-chalk-muted">
                          [{slotIdx}]
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Semaphores Gauges */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 rounded border border-chalk-foreground/30 bg-black/30 px-3 py-1.5 text-xs font-mono text-chalk-foreground">
                  <span className="text-chalk-muted">empty semaphore:</span>
                  <span className="font-bold text-chalk-yellow text-sm">{currentEmptySlots}</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-chalk-foreground/30 bg-black/30 px-3 py-1.5 text-xs font-mono text-chalk-foreground">
                  <span className="text-chalk-muted">full semaphore:</span>
                  <span className="font-bold text-chalk-yellow text-sm">{currentFullSlots}</span>
                </div>
              </div>

              <p className="text-center font-hand text-lg text-chalk-foreground italic">
                These two counters are the semaphores empty and full.
              </p>
            </div>

            {/* Consumer Box */}
            <div className={`rounded-lg border-2 p-4 text-center transition-all ${
              currentConsumerState === "working"
                ? "border-chalk-yellow bg-highlight/30 text-chalk-foreground shadow-[0_0_12px_rgba(245,223,116,0.3)]"
                : currentConsumerState === "waiting"
                ? "border-destructive bg-destructive/20 text-chalk-foreground"
                : "border-chalk-foreground/30 bg-white/5 text-chalk-muted"
            }`}>
              <span className="font-mono text-xs uppercase tracking-wider block">CONSUMER</span>
              <span className="font-hand text-2xl font-bold block mt-1">
                {currentConsumerState === "working" ? "Working" : currentConsumerState === "waiting" ? "Waiting (Empty)" : "Resting"}
              </span>
              <span className={`font-mono text-xs mt-2 block ${currentConsumerState === "working" ? "text-chalk-foreground font-semibold" : "text-chalk-muted"}`}>
                Period C = {consumerPeriod} tick{consumerPeriod > 1 ? "s" : ""}
              </span>
              {activeLog?.consumedItem && currentConsumerState === "working" && (
                <span className="mt-2 inline-block rounded bg-highlight text-foreground px-2 py-0.5 font-mono text-xs font-bold">
                  ✓ Item {activeLog.consumedItem}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Narration */}
        <div
          role="region"
          aria-live="polite"
          className="rounded-md border border-chalk-foreground/25 bg-black/20 p-4 font-hand text-2xl text-chalk-foreground min-h-[4rem] flex items-center"
        >
          {activeLog ? (
            activeLog.narration
          ) : (
            <span className="text-chalk-muted">
              Press "Play" or "Step" to start the simulation tick by tick.
            </span>
          )}
        </div>
      </div>

      {/* Insight Banner */}
      {simResult && currentTick > 0 && (
        <div className="paper-card border-l-4 border-l-primary p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Lab Observation</p>
          <p className="mt-1 font-hand text-2xl font-bold">{simResult.insight}</p>
        </div>
      )}

      {/* Results and Live Metrics Cards */}
      {simResult && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Items Produced / Consumed</span>
            <p className="font-hand text-3xl font-bold">
              {activeLog ? activeLog.tick > 0 ? (activeLog.producedItem ?? (simResult.logs.slice(0, currentTick).filter(l => l.producedItem !== undefined).length)) : 0 : 0} produced · {simResult.logs.slice(0, currentTick).filter(l => l.consumedItem !== undefined).length} consumed
            </p>
            <p className="font-mono text-xs text-muted-foreground">In buffer: {currentOccupancy} / {bufferSize}</p>
          </div>

          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Peak &amp; Avg Occupancy</span>
            <p className="font-hand text-3xl font-bold">
              {simResult.totals.peakOccupancy} peak · {(currentTick > 0 ? (simResult.logs.slice(0, currentTick).reduce((acc, l) => acc + l.occupancy, 0) / currentTick).toFixed(2) : "0.00")} avg
            </p>
            <p className="font-mono text-xs text-muted-foreground">Capacity: {bufferSize} slots</p>
          </div>

          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Producer Blocked</span>
            <p className="font-hand text-3xl font-bold">
              {simResult.logs.slice(0, currentTick).filter(l => l.producerState === "waiting").length} ticks ({currentTick > 0 ? ((simResult.logs.slice(0, currentTick).filter(l => l.producerState === "waiting").length / currentTick) * 100).toFixed(1) : "0.0"}%)
            </p>
            <p className="font-mono text-xs text-muted-foreground">Buffer was full</p>
          </div>

          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Consumer Blocked</span>
            <p className="font-hand text-3xl font-bold">
              {simResult.logs.slice(0, currentTick).filter(l => l.consumerState === "waiting").length} ticks ({currentTick > 0 ? ((simResult.logs.slice(0, currentTick).filter(l => l.consumerState === "waiting").length / currentTick) * 100).toFixed(1) : "0.0"}%)
            </p>
            <p className="font-mono text-xs text-muted-foreground">Buffer was empty</p>
          </div>
        </div>
      )}

      {/* Calculations Dialog */}
      {simResult && (
        <Dialog open={calculationsOpen} onOpenChange={setCalculationsOpen}>
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto bg-paper">
            <DialogHeader>
              <DialogTitle className="font-hand text-3xl font-bold">Producer-Consumer Calculations</DialogTitle>
              <DialogDescription>
                Live and final mathematical formulas with current parameters plugged in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4 text-sm font-mono">
              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">1. Buffer Occupancy</span>
                <p>In buffer = Produced − Consumed</p>
                <p className="mt-1 font-bold text-primary">
                  = {simResult.totals.produced} − {simResult.totals.consumed} = {simResult.totals.inBuffer} items
                </p>
              </div>

              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">2. Empty Semaphore Count</span>
                <p>Empty slots = Buffer Capacity (N) − In Buffer</p>
                <p className="mt-1 font-bold text-primary">
                  = {bufferSize} − {simResult.totals.inBuffer} = {bufferSize - simResult.totals.inBuffer}
                </p>
              </div>

              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">3. Average Occupancy</span>
                <p>Average Occupancy = Sum of end-of-tick occupancies / Total ticks</p>
                <p className="mt-1 font-bold text-primary">
                  = {simResult.totals.sumOccupancy} / {simResult.totals.ticks} = {simResult.totals.averageOccupancy.toFixed(2)} items
                </p>
              </div>

              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">4. Throughput</span>
                <p>Throughput = Total items consumed / Total ticks</p>
                <p className="mt-1 font-bold text-primary">
                  = {simResult.totals.consumed} / {simResult.totals.ticks} = {simResult.totals.throughput.toFixed(4)} items/tick
                </p>
              </div>

              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">5. Blocked Rates</span>
                <p>Producer Blocked % = (Producer Blocked Ticks / Total ticks) × 100</p>
                <p className="mt-1 font-bold text-primary">
                  = ({simResult.totals.producerBlockedTicks} / {simResult.totals.ticks}) × 100 = {simResult.totals.producerBlockedPercent.toFixed(1)}%
                </p>
                <p className="mt-2">Consumer Blocked % = (Consumer Blocked Ticks / Total ticks) × 100</p>
                <p className="mt-1 font-bold text-primary">
                  = ({simResult.totals.consumerBlockedTicks} / {simResult.totals.ticks}) × 100 = {simResult.totals.consumerBlockedPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
