"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Droplet,
  Heart,
  Home,
  Leaf,
  LogOut,
  Plus,
  Printer,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Smile,
  Star,
  Sun,
  Users,
  Utensils,
  X,
  Menu,
  ClipboardList,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { recipes, defaultPreferences, demoData } from "@/lib/demo";
import {
  contexts,
  toMg,
  toMmol,
  schemas,
  patterns,
  consolidate,
  suitable,
  type Row,
  type Table,
  type Reading,
  type Meal,
} from "@/lib/domain";
import { browserClient } from "@/lib/supabase";
const nav = [
  { href: "/", label: "My home", icon: Home },
  { href: "/glucose", label: "My health", icon: Heart },
  { href: "/meals", label: "Meals & recipes", icon: Utensils },
  { href: "/shopping", label: "Shopping list", icon: ShoppingBasket },
  { href: "/trends", label: "Trends & patterns", icon: Activity },
  { href: "/caregiver", label: "My care circle", icon: Users },
];
const names: Record<string, string> = {
  home: "My home",
  glucose: "My health",
  "blood-pressure": "My health",
  meals: "Meals & recipes",
  recipe: "Meals & recipes",
  history: "Meal history",
  shopping: "Shopping list",
  trends: "Trends & patterns",
  preferences: "Food preferences",
  caregiver: "My care circle",
  notes: "Notes & reports",
  settings: "Settings",
  welcome: "Welcome",
  day: "My day",
};
const fmt = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const localTime = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const today = () => new Date().toLocaleDateString("en-CA");
export default function CarePlate({ section }: { section: string }) {
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [demo, setDemo] = useState(true);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [owner, setOwner] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState("");
  const [large, setLarge] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mealFilter, setMealFilter] = useState("All meals");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(7);
  const [grants, setGrants] = useState<Row[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState("salmon");
  const [mealSource, setMealSource] = useState("");
  const [unit, setUnit] = useState("mg/dL");
  const [glucose, setGlucose] = useState("");
  const [planDate, setPlanDate] = useState(today());
  const [planServings, setPlanServings] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shop, setShop] = useState<any[]>([]);
  const pref: Record<string, any> = {
    ...defaultPreferences,
    ...data.food_preferences?.at(-1),
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem("careplate-demo-v1");
      setData(saved ? JSON.parse(saved) : demoData());
      setLarge(localStorage.getItem("cp-large") === "true");
      setContrast(localStorage.getItem("cp-contrast") === "true");
    } catch {
      setData(demoData());
    }
    setLoaded(true);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const db = browserClient();
    db?.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        setUserId(session.user.id);
        setOwner(session.user.id);
        setDemo(false);
      }
    });
  }, []);
  useEffect(() => {
    if (loaded && demo)
      localStorage.setItem("careplate-demo-v1", JSON.stringify(data));
  }, [data, loaded, demo]);
  useEffect(() => {
    if (!demo && token) {
      setLoaded(false);
      fetch("/api/data?owner=" + encodeURIComponent(owner || userId), {
        headers: { Authorization: "Bearer " + token },
      })
        .then(async (r) => {
          const b = await r.json();
          if (!r.ok) throw Error(b.error);
          setData(b);
        })
        .catch((e) => {
          setError(e.message);
          setData({});
        })
        .finally(() => setLoaded(true));
      fetch("/api/caregiver", { headers: { Authorization: "Bearer " + token } })
        .then((r) => r.json())
        .then((b) => setGrants(b.grants || []));
    }
  }, [demo, token, owner, userId]);
  useEffect(() => {
    if (modal === "meal") setMealSource("");
    if (!modal) return;
    const trigger = document.activeElement as HTMLElement;
    return () => trigger?.focus();
  }, [modal]);
  useEffect(() => {
    setShop(data.shopping_lists?.at(-1)?.items || []);
  }, [data.shopping_lists]);
  const notify = (s: string) => {
    setMessage(s);
    setError("");
  };
  async function save(table: Table, record: any) {
    const parsed = schemas[table].safeParse(record);
    if (!parsed.success)
      throw Error(parsed.error.issues.map((i) => i.message).join(". "));
    let row: Row = {
      ...parsed.data,
      id: crypto.randomUUID(),
      created_by: "Demo senior Margaret",
    };
    if (!demo) {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          table,
          record: parsed.data,
          owner: owner || userId,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      row = body;
    }
    setData((d) => ({ ...d, [table]: [...(d[table] || []), row] }));
    return row;
  }
  async function submit(
    e: FormEvent<HTMLFormElement>,
    table: Table,
    make: (f: FormData) => any,
  ) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save(table, make(new FormData(e.currentTarget)));
      notify("Saved. Your record has been added.");
      setModal("");
      setGlucose("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const latestG = [...(data.glucose_readings || [])].sort(
    (a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at),
  )[0];
  const latestB = [...(data.blood_pressure_readings || [])].sort(
    (a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at),
  )[0];
  const selected = recipes.find((r) => r.id === selectedRecipe) || recipes[0];
  const tasteScore = (id: string) =>
    (data.meal_ratings || [])
      .filter(
        (r) =>
          r.again &&
          r.enjoyed &&
          (data.meal_logs || []).some(
            (m) => m.id === r.meal_id && m.recipe_id === id,
          ),
      )
      .reduce((s, r) => s + r.stars, 0);
  const visibleRecipes = recipes
    .filter(
      (r) =>
        (mealFilter === "All meals" || r.slot === mealFilter) &&
        r.name.toLowerCase().includes(search.toLowerCase()) &&
        r.minutes <= pref.max_time &&
        suitable(r, pref.allergies, pref.dislikes),
    )
    .sort((a, b) => tasteScore(b.id) - tasteScore(a.id));
  const clinical = data.clinician_settings?.[0];
  const alertReading =
    latestG &&
    clinical &&
    ((clinical.action_low_mg != null &&
      toMg(latestG.value, latestG.unit) < clinical.action_low_mg) ||
      (clinical.action_high_mg != null &&
        toMg(latestG.value, latestG.unit) > clinical.action_high_mg));
  const observations = patterns(
    (data.meal_logs || []) as Meal[],
    (data.glucose_readings || []) as Reading[],
  );
  const plans = (data.meal_plans || []).filter((p) => p.date === today());
  const cardRecipe = (r: (typeof recipes)[number]) => (
    <article className="recipe-card" key={r.id}>
      <div className={"food-art " + r.id}>
        <FoodArt kind={r.id} />
        <span className="art-label">{r.slot}</span>
        <button
          className="bookmark"
          aria-label={"View " + r.name}
          onClick={() => {
            setSelectedRecipe(r.id);
            setModal("recipe");
          }}
        >
          <BookOpen size={19} />
        </button>
      </div>
      <div className="recipe-body">
        <div className="recipe-meta">
          <span>
            <Clock size={14} /> {r.minutes} min
          </span>
          <span>{r.carbs}g carbs / serving</span>
        </div>
        <button
          className="recipe-title"
          onClick={() => {
            setSelectedRecipe(r.id);
            setModal("recipe");
          }}
        >
          {r.name}
        </button>
        <p>
          {tasteScore(r.id) > 0
            ? "You enjoyed this before. Suggested for taste; nutrition needs remain individual."
            : r.description}
        </p>
        <button
          className="text-button"
          onClick={() => {
            setSelectedRecipe(r.id);
            setModal("recipe");
          }}
        >
          View recipe <ArrowRight size={17} />
        </button>
      </div>
    </article>
  );
  const recipeDetail = (
    <>
      <div className={"food-art detail-art " + selected.id}>
        <FoodArt kind={selected.id} />
      </div>
      <p className="eyebrow">
        {selected.slot} · {selected.minutes} MINUTES · 1 SERVING
      </p>
      <h2>{selected.name}</h2>
      <p>{selected.description}</p>
      {!suitable(selected, pref.allergies) && (
        <div className="error-box" role="alert">
          This recipe includes an ingredient matching your recorded allergies.
          Choose another meal; planning this recipe is disabled.
        </div>
      )}
      <div className="nutrition">
        {[
          ["Carbs", selected.carbs + "g"],
          ["Fiber", selected.fiber + "g"],
          ["Protein", selected.protein + "g"],
          ["Sodium", selected.sodium + "mg"],
          ["Calories", selected.calories],
        ].map(([l, v]) => (
          <div key={l}>
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <p className="small">
        Estimates per serving · Source: illustrative demo recipe calculations.
        Not laboratory-verified. Allergens:{" "}
        {selected.allergens.join(", ") || "none listed"}. Always check packaging
        and cross-contact.
      </p>
      <h3>What you’ll need</h3>
      <ul>
        {selected.ingredients.map((i) => (
          <li key={i.name}>
            {i.quantity} {i.unit} {i.name}
          </li>
        ))}
      </ul>
      <h3>Let’s make it</h3>
      <ol className="steps">
        {selected.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="info-box">
        <Leaf /> Selected for your preparation time and food preferences.
        Nutrition guidance is individual; discuss your needs with your
        clinician.
      </div>
      <div className="form-grid">
        <label>
          Plan for date
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            required
          />
        </label>
        <label>
          Servings to prepare
          <input
            type="number"
            min="1"
            max="20"
            value={planServings}
            onChange={(e) => setPlanServings(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="button-row">
        <button
          className="primary"
          disabled={
            busy ||
            !planDate ||
            planServings < 1 ||
            planServings > 20 ||
            !suitable(selected, pref.allergies)
          }
          onClick={async () => {
            setBusy(true);
            try {
              await save("meal_plans", {
                recipe_id: selected.id,
                date: planDate,
                slot: selected.slot,
                servings: planServings,
              });
              notify("Added to your meal plan.");
              setModal("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Plus size={18} /> Add to meal plan
        </button>
        <button className="secondary" onClick={() => setModal("meal")}>
          I ate this meal
        </button>
      </div>
    </>
  );
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            mode: demo ? "synthetic demo" : "account records",
            ...data,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "careplate-records.json";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Your data export has downloaded. Keep it in a private place.");
  }
  async function caregiverAction(action: string, id?: string, email?: string) {
    setBusy(true);
    try {
      if (demo) {
        notify(
          "Demo only: no invitation sent. Sign in to invite a real caregiver.",
        );
        return;
      }
      const r = await fetch("/api/caregiver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ action, id, email }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setGrants(b.grants || []);
      notify(
        action === "invite"
          ? "Invitation created. Your caregiver can sign in with this email to accept."
          : "Care circle updated.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const title = (
    eyebrow: string,
    h: string,
    p: string,
    action?: React.ReactNode,
  ) => (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{h}</h1>
        <p>{p}</p>
      </div>
      {action}
    </div>
  );
  return (
    <div
      className={`${large ? "large-text " : ""}${contrast ? "high-contrast " : ""}app-shell`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside inert={!!modal} className={mobile ? "sidebar open" : "sidebar"}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          CarePlate<span className="brand-dot">●</span>
        </Link>
        <div className="workspace-label">YOUR EVERYDAY WELLNESS</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobile(false)}
              className={
                (
                  n.href === "/"
                    ? section === "home"
                    : n.href === "/glucose"
                      ? ["glucose", "blood-pressure", "day"].includes(section)
                      : n.href === "/meals"
                        ? ["meals", "recipe", "history"].includes(section)
                        : n.href === "/caregiver"
                          ? ["caregiver", "notes"].includes(section)
                          : n.href === "/" + section
                )
                  ? "nav-item active"
                  : "nav-item"
              }
            >
              <n.icon size={21} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <span className="care-heart">
              <Heart size={22} />
            </span>
            <strong>A little care, every day.</strong>
            <p>Small steps make a meaningful difference.</p>
            <Link href="/welcome">
              Your CarePlate guide <ArrowUpRight size={16} />
            </Link>
          </div>
          <Link
            className={"nav-item " + (section === "settings" ? "active" : "")}
            href="/settings"
          >
            <Settings size={20} />
            Settings & accessibility
          </Link>
          <div className="profile">
            <div className="avatar">{demo ? "M" : "Y"}</div>
            <div>
              <strong>{demo ? "Margaret Wilson" : "Your account"}</strong>
              <span>
                {demo
                  ? "Senior · Demo profile"
                  : owner !== userId
                    ? "Caregiver view"
                    : "Personal account"}
              </span>
            </div>
            <button
              aria-label="Account settings"
              onClick={() => location.assign("/settings")}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={!!modal}>
        <header className="topbar">
          <button
            className="mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            My wellness <ChevronRight size={14} />
            <strong>{names[section]}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-badge">
              <span />
              {demo ? "Demo mode" : "Secure account"}
            </span>
            <button
              onClick={() => {
                setLarge(!large);
                localStorage.setItem("cp-large", String(!large));
              }}
              className="text-size"
              aria-label="Toggle larger text"
              aria-pressed={large}
            >
              A<span>A</span>
            </button>
            <Link
              href="/caregiver"
              className="circle-button"
              aria-label="Care circle"
            >
              <Users size={20} />
            </Link>
            <span className="mini-avatar">{demo ? "M" : "Y"}</span>
          </div>
        </header>
        <main id="main">
          <div className="page-inner">
            {message && (
              <div className="toast" role="status">
                <Check size={20} />
                {message}
                <button
                  aria-label="Dismiss confirmation"
                  onClick={() => setMessage("")}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={18} />
                </button>
              </div>
            )}
            {alertReading && (
              <div className="clinical-alert" role="alert">
                <strong>
                  This reading is outside your clinician’s action limits.
                </strong>
                <p>
                  Follow your established care plan and seek appropriate medical
                  help. Do not rely on AI advice.
                </p>
                <p>{clinical?.action_plan}</p>
              </div>
            )}
            {!loaded ? (
              <div className="loading" role="status">
                Getting your day ready…
              </div>
            ) : (
              <>
                {section === "home" && (
                  <>
                    <div className="greeting">
                      <div>
                        <p className="date-line">
                          <Sun size={17} />
                          {new Date().toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <h1>A good day starts with a little care.</h1>
                        <p>
                          Welcome back, {demo ? "Margaret" : "friend"}. Let’s
                          take today one step at a time.
                        </p>
                      </div>
                      <Link href="/day" className="secondary calendar-button">
                        <CalendarDays size={18} />
                        View my day
                      </Link>
                    </div>
                    <section className="hero">
                      <div className="hero-copy">
                        <span className="hero-kicker">
                          <span />
                          YOUR WELLNESS, AT YOUR PACE
                        </span>
                        <h2>
                          Feel nourished.
                          <br />
                          Feel supported.
                        </h2>
                        <p>
                          Simple meals, helpful insights, and the people
                          <br className="desktop-break" /> who care. All in one
                          place.
                        </p>
                        <Link href="/meals" className="primary">
                          Find a meal for me <ArrowRight size={18} />
                        </Link>
                        <div className="hero-note">
                          <ShieldCheck size={15} />
                          Made for your everyday peace of mind
                        </div>
                      </div>
                      <div className="hero-visual">
                        <div className="orbit orbit-one" />
                        <div className="orbit orbit-two" />
                        <div className="hero-leaf one">
                          <Leaf size={40} />
                        </div>
                        <div className="hero-leaf two">
                          <Leaf size={25} />
                        </div>
                        <FoodArt kind="salmon" />
                        <div className="floating-label">
                          <span className="check-round">
                            <Check size={16} />
                          </span>
                          A little balance on every plate
                        </div>
                        <span className="visual-caption">
                          GOOD FOOD. YOUR WAY.
                        </span>
                      </div>
                    </section>
                    <section
                      className="quick-actions"
                      aria-label="Quick actions"
                    >
                      {[
                        {
                          title: "Log glucose",
                          sub: "A quick check-in",
                          icon: Droplet,
                          color: "peach",
                          modal: "glucose",
                        },
                        {
                          title: "Log blood pressure",
                          sub: "Keep track of your heart",
                          icon: Heart,
                          color: "rose",
                          modal: "bp",
                        },
                        {
                          title: "Find a meal",
                          sub: "Something you’ll enjoy",
                          icon: Utensils,
                          color: "sage",
                          href: "/meals",
                        },
                        {
                          title: "View my day",
                          sub: "Your day, at a glance",
                          icon: CalendarDays,
                          color: "lavender",
                          href: "/day",
                        },
                      ].map((a) => (
                        <button
                          className="quick-action"
                          key={a.title}
                          onClick={() =>
                            a.href
                              ? location.assign(a.href)
                              : setModal(a.modal!)
                          }
                        >
                          <span className={"action-icon " + a.color}>
                            <a.icon size={25} />
                          </span>
                          <span>
                            <strong>{a.title}</strong>
                            <small>{a.sub}</small>
                          </span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </section>
                    <div className="home-grid">
                      <section>
                        <div className="section-heading">
                          <h2>Your latest check-ins</h2>
                          <Link href="/trends">
                            View trends <ArrowRight size={15} />
                          </Link>
                        </div>
                        <div className="vitals-grid">
                          <Vital
                            kind="glucose"
                            row={latestG}
                            onLog={() => setModal("glucose")}
                          />
                          <Vital
                            kind="bp"
                            row={latestB}
                            onLog={() => setModal("bp")}
                          />
                        </div>
                        <div className="section-heading meals-heading">
                          <h2>A little inspiration for your plate</h2>
                          <Link href="/meals">
                            Explore meals <ArrowRight size={15} />
                          </Link>
                        </div>
                        <div className="recipe-grid compact">
                          {visibleRecipes.slice(0, 2).map(cardRecipe)}
                        </div>
                      </section>
                      <aside className="day-column">
                        <div className="today-card">
                          <div className="section-heading">
                            <h2>On the menu today</h2>
                            <CalendarDays size={19} />
                          </div>
                          <p className="muted small">
                            A little planning, a little less to think about.
                          </p>
                          {plans.length ? (
                            plans
                              .slice()
                              .sort(
                                (a, b) =>
                                  ["Breakfast", "Lunch", "Dinner"].indexOf(
                                    a.slot,
                                  ) -
                                  ["Breakfast", "Lunch", "Dinner"].indexOf(
                                    b.slot,
                                  ),
                              )
                              .map((p) => {
                                const r = recipes.find(
                                  (r) => r.id === p.recipe_id,
                                );
                                return (
                                  r && (
                                    <button
                                      className="planned-meal"
                                      key={p.id}
                                      onClick={() => {
                                        setSelectedRecipe(r.id);
                                        setModal("recipe");
                                      }}
                                    >
                                      <span className={"meal-thumb " + r.id}>
                                        {r.emoji}
                                      </span>
                                      <span>
                                        <small>{p.slot}</small>
                                        <strong>{r.name}</strong>
                                        <em>
                                          {r.carbs * p.servings}g estimated
                                          carbs
                                        </em>
                                      </span>
                                      <ChevronRight size={16} />
                                    </button>
                                  )
                                );
                              })
                          ) : (
                            <p>
                              No meals planned yet. Choose a meal to get
                              started.
                            </p>
                          )}
                          <Link className="plan-link" href="/meals">
                            <Plus size={17} />
                            Plan a meal
                          </Link>
                        </div>
                        <div className="note-card">
                          <div className="note-heading">
                            <span>
                              <MessageCircle size={18} />A note from your care
                              circle
                            </span>
                            <span className="note-dot" />
                          </div>
                          <p>
                            “
                            {data.caregiver_notes?.at(-1)?.text ||
                              "Your care circle notes will appear here."}
                            ”
                          </p>
                          <Link href="/notes">
                            View notes <ArrowRight size={15} />
                          </Link>
                        </div>
                        <div className="gentle-note">
                          <Leaf size={20} />
                          <p>
                            Progress is made in small steps.
                            <br />
                            <strong>
                              You’re doing something good for you.
                            </strong>
                          </p>
                        </div>
                      </aside>
                    </div>
                  </>
                )}
                {["glucose", "blood-pressure"].includes(section) && (
                  <>
                    {title(
                      "YOUR EVERYDAY HEALTH",
                      "A moment to check in.",
                      "Keep a simple record to share with your care team.",
                    )}
                    <div className="tabs">
                      <Link
                        className={section === "glucose" ? "selected" : ""}
                        href="/glucose"
                      >
                        <Droplet size={18} />
                        Glucose
                      </Link>
                      <Link
                        className={
                          section === "blood-pressure" ? "selected" : ""
                        }
                        href="/blood-pressure"
                      >
                        <Heart size={18} />
                        Blood pressure
                      </Link>
                    </div>
                    <div className="two-column">
                      <section className="panel">
                        <h2>
                          {section === "glucose"
                            ? "Log your glucose"
                            : "Log your blood pressure"}
                        </h2>
                        <p>Your meter’s reading, just as you see it.</p>
                        {vitalForm(section === "glucose" ? "glucose" : "bp")}
                      </section>
                      <section>
                        <Vital
                          kind={section === "glucose" ? "glucose" : "bp"}
                          row={section === "glucose" ? latestG : latestB}
                          onLog={() =>
                            setModal(section === "glucose" ? "glucose" : "bp")
                          }
                        />
                        <div className="info-box spaced">
                          <ShieldCheck />
                          <div>
                            <strong>Your targets are personal.</strong>
                            <p>
                              {clinical
                                ? `Clinician-provided glucose targets: ${clinical.glucose_low_mg ?? "not set"} to ${clinical.glucose_high_mg ?? "not set"} mg/dL. Care plan: ${clinical.action_plan || "Follow the plan provided by your clinician."}`
                                : `No clinician targets or action plan have been configured in this ${demo ? "demo" : "account"}. Follow your existing care plan.`}{" "}
                              If you feel unwell or a reading concerns you, seek
                              appropriate medical help. Do not wait for an app
                              alert.
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>
                    <section className="panel spaced">
                      <div className="section-heading">
                        <h2>Recent readings</h2>
                        <Link href="/trends">
                          See trends <ArrowRight size={16} />
                        </Link>
                      </div>
                      <RecordTable
                        rows={
                          data[
                            section === "glucose"
                              ? "glucose_readings"
                              : "blood_pressure_readings"
                          ] || []
                        }
                        kind={section === "glucose" ? "glucose" : "bp"}
                      />
                    </section>
                  </>
                )}
                {section === "meals" && (
                  <>
                    {title(
                      "NOURISH YOUR EVERYDAY",
                      "Good food. Made for you.",
                      "Simple recipes, familiar ingredients, and room for what you love.",
                      <Link className="secondary" href="/preferences">
                        <SlidersHorizontal size={18} />
                        My food preferences
                      </Link>,
                    )}
                    <div className="meal-banner">
                      <div>
                        <span className="eyebrow">A LITTLE INSPIRATION</span>
                        <h2>
                          Something delicious.
                          <br />
                          Something doable.
                        </h2>
                        <p>Thoughtful meals that fit into your day.</p>
                      </div>
                      <FoodArt kind="salmon" />
                    </div>
                    <div className="filter-bar">
                      <div className="tabs" role="group" aria-label="Meal type">
                        {[
                          "All meals",
                          "Breakfast",
                          "Lunch",
                          "Dinner",
                          "Snack",
                        ].map((t) => (
                          <button
                            className={t === mealFilter ? "selected" : ""}
                            key={t}
                            onClick={() => setMealFilter(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <label className="search-label">
                        <span className="sr-only">Search meals</span>
                        <input
                          placeholder="Search your next favorite…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="section-heading">
                      <h2>
                        {mealFilter === "All meals"
                          ? "Picked with your preferences in mind"
                          : mealFilter + " ideas"}
                      </h2>
                      <span className="small muted">
                        {visibleRecipes.length} recipes · up to {pref.max_time}{" "}
                        min
                      </span>
                    </div>
                    <div className="recipe-grid">
                      {visibleRecipes.map(cardRecipe)}
                    </div>
                    {!visibleRecipes.length && (
                      <div className="panel">
                        No recipes match these preferences. Try another search
                        or review your preferences. Keep all allergy
                        restrictions in place.
                      </div>
                    )}
                    <div className="info-box spaced">
                      <ShieldCheck />
                      <p>
                        These are curated demo suggestions, with estimated
                        nutrition. Allergies and dislikes are filtered by
                        ingredient names; always confirm labels and preparation
                        with your care team. Complex clinician dietary
                        restrictions need individual review.
                      </p>
                    </div>
                  </>
                )}
                {section === "recipe" && (
                  <div className="panel narrow">{recipeDetail}</div>
                )}
                {["history", "day"].includes(section) && (
                  <>
                    {title(
                      "ONE DAY AT A TIME",
                      section === "day"
                        ? "Your day, at a glance."
                        : "Meals you’ve enjoyed.",
                      "Plan, record, and discover what works for your routine.",
                      <button
                        className="primary"
                        onClick={() => setModal("meal")}
                      >
                        <Plus size={18} />
                        Log a meal
                      </button>,
                    )}
                    <div className="button-row">
                      <Link className="secondary" href="/history">
                        Meal history
                      </Link>
                      <Link className="secondary" href="/meals">
                        Find a recipe
                      </Link>
                    </div>
                    {section === "day" && (
                      <section className="panel spaced">
                        <h2>Today’s plan</h2>
                        {plans.map((p) => (
                          <div className="list-row" key={p.id}>
                            <span>{p.slot}</span>
                            <strong>
                              {recipes.find((r) => r.id === p.recipe_id)?.name}
                            </strong>
                            <span>{p.servings} serving(s)</span>
                          </div>
                        ))}
                        {!plans.length && <p>No meals planned yet.</p>}
                      </section>
                    )}
                    <section className="panel spaced">
                      <h2>
                        {section === "day"
                          ? "Today’s meals"
                          : "Meal history & ratings"}
                      </h2>
                      {(data.meal_logs || [])
                        .filter(
                          (m) =>
                            section !== "day" ||
                            new Date(m.recorded_at).toLocaleDateString(
                              "en-CA",
                            ) === today(),
                        )
                        .slice()
                        .reverse()
                        .map((m) => (
                          <div className="history-row" key={m.id}>
                            <span className="history-emoji">
                              {recipes.find((r) => r.id === m.recipe_id)
                                ?.emoji || "🍽️"}
                            </span>
                            <div>
                              <h3>{m.name}</h3>
                              <p>
                                {fmt(m.recorded_at)} · {m.servings} serving(s) ·{" "}
                                {m.carbs}g estimated carbs
                              </p>
                              {m.notes && <p>{m.notes}</p>}
                              <small>
                                Recorded by{" "}
                                {demo
                                  ? m.created_by || "Demo senior Margaret"
                                  : m.created_by === userId
                                    ? "you"
                                    : "authorized care circle member"}
                              </small>
                            </div>
                            <button
                              className="secondary"
                              onClick={() => {
                                setSelectedRecipe(m.id);
                                setModal("rating");
                              }}
                            >
                              {data.meal_ratings?.some(
                                (r) => r.meal_id === m.id,
                              )
                                ? "★ " +
                                  data.meal_ratings
                                    .filter((r) => r.meal_id === m.id)
                                    .at(-1)?.stars +
                                  " · Rate again"
                                : "Rate this meal"}
                            </button>
                          </div>
                        ))}
                      {!data.meal_logs?.length && (
                        <p>Your meals will appear here after you log them.</p>
                      )}
                    </section>
                  </>
                )}
                {section === "shopping" && (
                  <>
                    {title(
                      "A LITTLE PLANNING GOES A LONG WAY",
                      "Your shopping list.",
                      "Everything you need, all in one place.",
                      <button
                        className="secondary"
                        onClick={() => window.print()}
                      >
                        <Printer size={18} />
                        Print or save PDF
                      </button>,
                    )}
                    <section className="panel">
                      <div className="section-heading">
                        <div>
                          <h2>From your meal plan to your basket</h2>
                          <p>
                            Generate a list for the next 3 or 7 days, with
                            quantities scaled to servings.
                          </p>
                        </div>
                        <select
                          aria-label="Shopping period"
                          value={period}
                          onChange={(e) => setPeriod(Number(e.target.value))}
                        >
                          <option value={3}>Next 3 days</option>
                          <option value={7}>Next 7 days</option>
                        </select>
                      </div>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const end = new Date();
                            end.setDate(end.getDate() + period);
                            const eligible = (data.meal_plans || [])
                              .filter(
                                (p) =>
                                  p.date >= today() &&
                                  p.date < end.toLocaleDateString("en-CA"),
                              )
                              .flatMap((p) => {
                                const r = recipes.find(
                                  (r) => r.id === p.recipe_id,
                                );
                                return r
                                  ? [{ recipe: r, servings: p.servings }]
                                  : [];
                              });
                            if (!eligible.length)
                              throw Error(
                                "Plan a meal first, then generate your list.",
                              );
                            const items = consolidate(eligible);
                            await save("shopping_lists", {
                              items,
                              days: period,
                            });
                            notify(
                              "Shopping list generated from your planned meals.",
                            );
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <ShoppingBasket size={18} />
                        Generate shopping list
                      </button>
                    </section>
                    {shop.length > 0 && (
                      <>
                        <div className="shopping-progress">
                          <Check size={18} />
                          {
                            shop.filter((i) => i.checked || i.owned).length
                          } of {shop.length} items ready{" "}
                          <span>
                            Changes are saved when you select “Save list”.
                          </span>
                        </div>
                        <div className="shopping-grid">
                          {[
                            "Produce",
                            "Protein",
                            "Dairy",
                            "Grains",
                            "Pantry",
                            "Frozen",
                          ].map(
                            (category) =>
                              shop.some((i) => i.category === category) && (
                                <section className="panel" key={category}>
                                  <h2>{category}</h2>
                                  {shop.map(
                                    (i, index) =>
                                      i.category === category && (
                                        <div
                                          className="shopping-item"
                                          key={i.name}
                                        >
                                          <label
                                            className={
                                              i.checked || i.owned
                                                ? "checked"
                                                : ""
                                            }
                                          >
                                            <input
                                              type="checkbox"
                                              checked={i.checked}
                                              onChange={(e) =>
                                                setShop((s) =>
                                                  s.map((x, j) =>
                                                    j === index
                                                      ? {
                                                          ...x,
                                                          checked:
                                                            e.target.checked,
                                                        }
                                                      : x,
                                                  ),
                                                )
                                              }
                                            />
                                            <span>{i.name}</span>
                                          </label>
                                          <div className="quantity">
                                            <input
                                              aria-label={i.name + " quantity"}
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={i.quantity}
                                              onChange={(e) =>
                                                setShop((s) =>
                                                  s.map((x, j) =>
                                                    j === index
                                                      ? {
                                                          ...x,
                                                          quantity: Number(
                                                            e.target.value,
                                                          ),
                                                        }
                                                      : x,
                                                  ),
                                                )
                                              }
                                            />
                                            <span>{i.unit}</span>
                                          </div>
                                          <label className="owned">
                                            <input
                                              type="checkbox"
                                              checked={i.owned}
                                              onChange={(e) =>
                                                setShop((s) =>
                                                  s.map((x, j) =>
                                                    j === index
                                                      ? {
                                                          ...x,
                                                          owned:
                                                            e.target.checked,
                                                        }
                                                      : x,
                                                  ),
                                                )
                                              }
                                            />
                                            Already have it
                                          </label>
                                        </div>
                                      ),
                                  )}
                                </section>
                              ),
                          )}
                        </div>
                        <div className="button-row spaced">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={async () => {
                              try {
                                await save("shopping_lists", {
                                  items: shop,
                                  days: period,
                                });
                                notify(
                                  "Shopping list saved for your authorized care circle.",
                                );
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            <Check size={18} />
                            Save list
                          </button>
                          <button
                            className="secondary"
                            onClick={async () => {
                              const text = shop
                                .map(
                                  (i) =>
                                    `${i.checked || i.owned ? "✓" : "□"} ${i.quantity} ${i.unit} ${i.name}`,
                                )
                                .join("\n");
                              try {
                                if (navigator.share)
                                  await navigator.share({
                                    title: "CarePlate shopping list",
                                    text,
                                  });
                                else {
                                  await navigator.clipboard.writeText(text);
                                  notify(
                                    "Shopping list copied. Share it with your caregiver.",
                                  );
                                }
                              } catch {
                                notify(
                                  "Use Print to share a paper list or PDF.",
                                );
                              }
                            }}
                          >
                            Share list <ArrowUpRight size={18} />
                          </button>
                        </div>
                      </>
                    )}
                    {!shop.length && (
                      <div className="empty-state">
                        <ShoppingBasket size={40} />
                        <h2>A simpler trip to the store.</h2>
                        <p>Plan a few meals, then generate your list above.</p>
                        <Link className="text-button" href="/meals">
                          Find a meal <ArrowRight size={18} />
                        </Link>
                      </div>
                    )}
                  </>
                )}
                {section === "trends" && (
                  <>
                    {title(
                      "A CLEARER PICTURE, OVER TIME",
                      "Small check-ins. Helpful insights.",
                      "Your records can help guide conversations with your clinician.",
                      <button
                        className="secondary"
                        onClick={() => window.print()}
                      >
                        <Printer size={18} />
                        Print summary
                      </button>,
                    )}
                    <div className="tabs">
                      {[
                        [1, "Day"],
                        [7, "Week"],
                        [30, "Month"],
                      ].map(([n, l]) => (
                        <button
                          className={period === n ? "selected" : ""}
                          key={n}
                          onClick={() => setPeriod(Number(n))}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <section className="panel">
                      <h2>Recorded glucose</h2>
                      <GlucoseChart
                        readings={data.glucose_readings || []}
                        days={period}
                      />
                      <p className="small">
                        {clinical
                          ? `Clinician target range: ${clinical.glucose_low_mg ?? "not set"}–${clinical.glucose_high_mg ?? "not set"} mg/dL.`
                          : "No clinician target range has been set."}{" "}
                        Points show recorded values, without medical
                        interpretation.
                      </p>
                    </section>
                    <section className="panel spaced">
                      <h2>Blood pressure records</h2>
                      <RecordTable
                        rows={(data.blood_pressure_readings || []).filter(
                          (r) =>
                            Date.now() - Date.parse(r.recorded_at) <=
                            period * 86400000,
                        )}
                        kind="bp"
                      />
                    </section>
                    <section className="panel spaced">
                      <div className="section-heading">
                        <h2>Food & glucose: possible patterns</h2>
                        <Leaf size={22} />
                      </div>
                      <p>
                        We compare a reading within 60 minutes before a meal
                        with one 60–180 minutes afterward. At least three
                        matched meals with the same name are needed.
                      </p>
                      {observations.length ? (
                        observations.map((o) => (
                          <div className="pattern" key={o.name}>
                            <h3>
                              {o.name} · {o.count} paired observations
                            </h3>
                            <p>
                              Recorded glucose changed by an average of{" "}
                              {o.average > 0 ? "+" : ""}
                              {o.average} mg/dL. Post-meal measurements were
                              taken {o.timing} after eating.
                            </p>
                            <p>Recorded context: {o.factors}.</p>
                            <strong>
                              This is an association, not proof that a food
                              caused a change.
                            </strong>
                            <p>
                              Medication, activity, stress, illness, portion
                              sizes, and timing can also matter. Consider
                              recording portions consistently and discussing
                              recurring concerns with your clinician.
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="info-box">
                          <BookOpen />
                          <p>
                            <strong>
                              A little more information will help.
                            </strong>
                            <br />
                            There aren’t three paired observations of the same
                            meal yet. Keep logging meals and relevant readings
                            as your care team recommends. A single reading won’t
                            remove any food from your plan.
                          </p>
                        </div>
                      )}
                    </section>
                  </>
                )}
                {section === "preferences" && (
                  <>
                    {title(
                      "FOOD THAT FITS YOUR LIFE",
                      "Your plate. Your preferences.",
                      "Tell us what you enjoy and what you need to avoid.",
                    )}
                    <form
                      className="panel preferences-form"
                      onSubmit={(e) =>
                        submit(e, "food_preferences", (f) => ({
                          allergies: String(f.get("allergies"))
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                          dislikes: String(f.get("dislikes"))
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                          ...Object.fromEntries(
                            [
                              "preferred",
                              "restrictions",
                              "cuisines",
                              "ability",
                              "budget",
                              "shopping",
                              "equipment",
                              "diabetes_type",
                              "guidance",
                              "kidney_guidance",
                            ].map((k) => [k, String(f.get(k) || "")]),
                          ),
                          max_time: Number(f.get("max_time")),
                          servings: Number(f.get("servings")),
                        }))
                      }
                    >
                      <h2>What feels like you?</h2>
                      <div className="form-grid">
                        {[
                          ["preferred", "Foods you enjoy"],
                          ["dislikes", "Foods you dislike (comma separated)"],
                          ["allergies", "Allergies (comma separated)"],
                          ["restrictions", "Dietary restrictions"],
                          ["cuisines", "Favorite cuisines"],
                          ["ability", "Cooking ability"],
                          ["budget", "Grocery budget"],
                          ["shopping", "Shopping preferences"],
                          ["equipment", "Kitchen equipment"],
                          ["diabetes_type", "Diabetes type, if known"],
                        ].map(([k, l]) => (
                          <label key={k}>
                            {l}
                            <input
                              name={k}
                              defaultValue={
                                Array.isArray(pref[k])
                                  ? pref[k].join(", ")
                                  : pref[k]
                              }
                            />
                          </label>
                        ))}
                        <label>
                          Maximum preparation time (minutes)
                          <input
                            type="number"
                            name="max_time"
                            defaultValue={pref.max_time}
                            min="5"
                            max="240"
                            required
                          />
                        </label>
                        <label>
                          Servings per meal
                          <input
                            type="number"
                            name="servings"
                            defaultValue={pref.servings}
                            min="1"
                            max="20"
                            required
                          />
                        </label>
                      </div>
                      <h3>Optional clinician-provided guidance</h3>
                      <p>
                        Record instructions you have already received. CarePlate
                        does not create dietary or treatment targets.
                      </p>
                      <label>
                        Dietary targets or guidance
                        <textarea
                          name="guidance"
                          defaultValue={pref.guidance}
                        />
                      </label>
                      <label>
                        Kidney-related restrictions, only if your clinician
                        provided them
                        <textarea
                          name="kidney_guidance"
                          defaultValue={pref.kidney_guidance}
                        />
                      </label>
                      <div className="info-box">
                        <ShieldCheck />
                        <p>
                          Free-text dietary guidance is saved for your care
                          circle to review. The demo recipe filter cannot
                          reliably apply complex medical restrictions. Review
                          every recipe with your care team.
                        </p>
                      </div>
                      <button className="primary spaced" disabled={busy}>
                        {busy ? "Saving…" : "Save my preferences"}
                      </button>
                    </form>
                  </>
                )}
                {section === "caregiver" && (
                  <>
                    {title(
                      "BETTER, TOGETHER",
                      "Your circle of care.",
                      "You choose who can help, and you stay in control.",
                      <Link className="secondary" href="/notes">
                        <MessageCircle size={18} />
                        Notes & weekly report
                      </Link>,
                    )}
                    <section className="panel">
                      <h2>A helping hand, with your permission.</h2>
                      <p>
                        Invite a caregiver by their account email. They must
                        accept while signed in. You can revoke access at any
                        time. Invited caregivers can view and add records; they
                        cannot change your permissions or delete your account.
                      </p>
                      {demo && (
                        <div className="demo-notice">
                          <Users size={22} />
                          <div>
                            <strong>Meet Sarah, your demo caregiver</strong>
                            <p>
                              This is an illustration of shared care. No real
                              person has access to this demo. Sign in to create
                              a real invitation.
                            </p>
                          </div>
                        </div>
                      )}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          caregiverAction(
                            "invite",
                            undefined,
                            String(new FormData(e.currentTarget).get("email")),
                          );
                        }}
                        className="invite-form"
                      >
                        <label>
                          Caregiver’s email
                          <input
                            type="email"
                            name="email"
                            placeholder="name@example.com"
                            required
                          />
                        </label>
                        <button className="primary" disabled={busy}>
                          <Plus size={18} />
                          Invite caregiver
                        </button>
                      </form>
                      {grants.map((g) => (
                        <div className="list-row" key={g.id}>
                          <div>
                            <strong>{g.invitee_email}</strong>
                            <p>
                              {g.revoked_at
                                ? "Access revoked"
                                : g.accepted_at
                                  ? "Access active"
                                  : "Invitation pending"}
                            </p>
                          </div>
                          {g.senior_id === userId && !g.revoked_at && (
                            <button
                              className="secondary"
                              onClick={() => caregiverAction("revoke", g.id)}
                            >
                              Revoke access
                            </button>
                          )}
                          {g.senior_id !== userId &&
                            !g.accepted_at &&
                            !g.revoked_at && (
                              <button
                                className="primary"
                                onClick={() => caregiverAction("accept", g.id)}
                              >
                                Accept invitation
                              </button>
                            )}
                          {g.accepted_at &&
                            !g.revoked_at &&
                            g.senior_id !== userId && (
                              <button
                                className="secondary"
                                onClick={() => {
                                  setOwner(g.senior_id);
                                  notify(
                                    "Viewing authorized senior records. New entries will be attributed to your account.",
                                  );
                                }}
                              >
                                View senior’s records
                              </button>
                            )}
                        </div>
                      ))}
                      {owner && owner !== userId && (
                        <button
                          className="secondary"
                          onClick={() => setOwner(userId)}
                        >
                          Return to my records
                        </button>
                      )}
                    </section>
                    <div className="two-column spaced">
                      <section className="panel">
                        <h2>Latest recorded vitals</h2>
                        <p>
                          Recorded glucose:{" "}
                          <strong>
                            {latestG
                              ? `${latestG.value} ${latestG.unit}`
                              : "No reading"}
                          </strong>
                        </p>
                        <p>
                          Blood pressure:{" "}
                          <strong>
                            {latestB
                              ? `${latestB.systolic}/${latestB.diastolic} mmHg`
                              : "No reading"}
                          </strong>
                        </p>
                        <div className="button-row">
                          <button
                            className="secondary"
                            onClick={() => setModal("glucose")}
                          >
                            Log glucose
                          </button>
                          <button
                            className="secondary"
                            onClick={() => setModal("bp")}
                          >
                            Log blood pressure
                          </button>
                        </div>
                      </section>
                      <section className="panel">
                        <h2>Plan something good together.</h2>
                        <p>
                          Use the shared meal plan, preferences, and shopping
                          list to make everyday care a little easier.
                        </p>
                        <div className="button-row">
                          <Link href="/shopping" className="secondary">
                            Shopping list
                          </Link>
                          <Link href="/preferences" className="secondary">
                            Food preferences
                          </Link>
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {section === "notes" && (
                  <>
                    {title(
                      "KEEP EVERYONE IN THE LOOP",
                      "A note makes a difference.",
                      "Little reminders and a shared view of the week.",
                      <button
                        className="secondary"
                        onClick={() => window.print()}
                      >
                        <Printer size={18} />
                        Print / save PDF
                      </button>,
                    )}
                    <div className="two-column">
                      <section className="panel">
                        <h2>Care circle notes</h2>
                        <form
                          onSubmit={(e) =>
                            submit(e, "caregiver_notes", (f) => ({
                              text: String(f.get("text")),
                              recorded_at: new Date().toISOString(),
                            }))
                          }
                        >
                          <label>
                            Add a note
                            <textarea
                              name="text"
                              required
                              maxLength={2000}
                              placeholder="A reminder, a plan, or a little encouragement…"
                            />
                          </label>
                          <button className="primary spaced" disabled={busy}>
                            <Plus size={18} />
                            Save note
                          </button>
                        </form>
                        {(data.caregiver_notes || [])
                          .slice()
                          .reverse()
                          .map((n) => (
                            <div className="saved-note" key={n.id}>
                              <p>{n.text}</p>
                              <small>
                                {fmt(n.recorded_at)} ·{" "}
                                {demo
                                  ? n.created_by || "Demo senior Margaret"
                                  : n.created_by === userId
                                    ? "You"
                                    : "Authorized care circle member"}
                              </small>
                            </div>
                          ))}
                      </section>
                      <section className="panel">
                        <p className="eyebrow">PAST 7 DAYS</p>
                        <h2>Your weekly summary</h2>
                        {[
                          ["Glucose readings", "glucose_readings"],
                          [
                            "Blood pressure readings",
                            "blood_pressure_readings",
                          ],
                          ["Meals recorded", "meal_logs"],
                        ].map(([label, key]) => (
                          <div className="summary-row" key={key}>
                            <span>{label}</span>
                            <strong>
                              {
                                (data[key] || []).filter(
                                  (r) =>
                                    Date.now() - Date.parse(r.recorded_at) <=
                                    7 * 86400000,
                                ).length
                              }
                            </strong>
                          </div>
                        ))}
                        <h3>Possible food-related patterns</h3>
                        <p>
                          {observations.length
                            ? `${observations.length} repeated association(s). See Trends & patterns for evidence and context.`
                            : "Not enough paired records for a repeated association yet."}
                        </p>
                        <p className="small">
                          Only recorded data is included. Missing readings do
                          not mean anything about health status. Bring your care
                          plan and questions to your appointment.
                        </p>
                        <button className="secondary" onClick={download}>
                          <Download size={18} />
                          Download full records
                        </button>
                      </section>
                    </div>
                  </>
                )}
                {section === "settings" && (
                  <>
                    {title(
                      "MAKE YOURSELF AT HOME",
                      "Your comfort. Your control.",
                      "Simple choices for accessibility, privacy, and your account.",
                    )}
                    <div className="two-column">
                      <section className="panel">
                        <h2>Easy on your eyes</h2>
                        <div className="setting-row">
                          <label htmlFor="large-text">Larger text</label>
                          <input
                            id="large-text"
                            type="checkbox"
                            checked={large}
                            onChange={(e) => {
                              setLarge(e.target.checked);
                              localStorage.setItem(
                                "cp-large",
                                String(e.target.checked),
                              );
                            }}
                          />
                        </div>
                        <div className="setting-row">
                          <label htmlFor="high-contrast">High contrast</label>
                          <input
                            id="high-contrast"
                            type="checkbox"
                            checked={contrast}
                            onChange={(e) => {
                              setContrast(e.target.checked);
                              localStorage.setItem(
                                "cp-contrast",
                                String(e.target.checked),
                              );
                            }}
                          />
                        </div>
                        <h3>Private by choice</h3>
                        <p>
                          CarePlate uses no external AI provider. Your
                          identifiable records are not sent to an AI service. A
                          future integration would require explicit informed
                          consent and appropriate privacy agreements.
                        </p>
                        <Link className="text-button" href="/caregiver">
                          Manage caregiver access <ArrowRight size={18} />
                        </Link>
                        <h3>Your data belongs to you</h3>
                        <p>
                          {demo
                            ? "Demo records are synthetic and stored in this browser. Do not enter real health information in demo mode."
                            : "Account records are stored in your configured Supabase project. Only your authorized care circle has access through database policies."}
                        </p>
                        <button className="secondary" onClick={download}>
                          <Download size={18} />
                          Export my records
                        </button>
                        <button
                          className="danger-button spaced"
                          onClick={() => setConfirmDelete(true)}
                        >
                          <Trash2 size={18} />
                          {demo
                            ? "Reset demo records"
                            : "Delete all my health records"}
                        </button>
                        {confirmDelete && (
                          <div className="confirm-box">
                            <strong>
                              {demo
                                ? "Reset all demo changes?"
                                : "Permanently delete your own health records?"}
                            </strong>
                            <p>
                              This cannot be undone. Export first if you need a
                              copy.{" "}
                              {demo
                                ? ""
                                : "Account sign-in remains active; contact your project administrator to erase the authentication identity and retained backups."}
                            </p>
                            <div className="button-row">
                              <button
                                className="danger-button"
                                disabled={busy}
                                onClick={async () => {
                                  if (demo) {
                                    setData(demoData());
                                    setConfirmDelete(false);
                                    notify("Demo records reset.");
                                  } else {
                                    setBusy(true);
                                    try {
                                      const r = await fetch("/api/account", {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: "Bearer " + token,
                                        },
                                      });
                                      if (!r.ok)
                                        throw Error(
                                          "Deletion failed. Please try again.",
                                        );
                                      setData({});
                                      setOwner(userId);
                                      setConfirmDelete(false);
                                      notify(
                                        "Your health records were deleted.",
                                      );
                                    } catch (e) {
                                      setError((e as Error).message);
                                    } finally {
                                      setBusy(false);
                                    }
                                  }
                                }}
                              >
                                Confirm deletion
                              </button>
                              <button
                                className="secondary"
                                onClick={() => setConfirmDelete(false)}
                              >
                                Keep records
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                      <section className="panel">
                        <h2>
                          {demo
                            ? "Try it, or make it yours."
                            : "Your signed-in account"}
                        </h2>
                        {demo ? (
                          <>
                            <p>
                              Demo mode is ready to explore. Real accounts
                              require a configured Supabase project.
                            </p>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const f = new FormData(e.currentTarget);
                                const db = browserClient();
                                if (!db) {
                                  setError(
                                    "Supabase is not configured. See README.md to connect your own project. Demo mode is available now.",
                                  );
                                  return;
                                }
                                setBusy(true);
                                const action =
                                  (
                                    (e.nativeEvent as SubmitEvent)
                                      .submitter as HTMLButtonElement
                                  )?.value || "signin";
                                const credentials = {
                                  email: String(f.get("email")),
                                  password: String(f.get("password")),
                                };
                                const result =
                                  action === "signup"
                                    ? await db.auth.signUp(credentials)
                                    : await db.auth.signInWithPassword(
                                        credentials,
                                      );
                                setBusy(false);
                                if (result.error) {
                                  setError(result.error.message);
                                  return;
                                }
                                if (result.data.session) {
                                  setData({});
                                  setDemo(false);
                                  setToken(result.data.session.access_token);
                                  setUserId(result.data.user!.id);
                                  setOwner(result.data.user!.id);
                                  notify(
                                    "Signed in. Your private account is open.",
                                  );
                                } else
                                  notify(
                                    "Check your email to confirm your account, then sign in.",
                                  );
                              }}
                            >
                              <label>
                                Email
                                <input
                                  type="email"
                                  name="email"
                                  autoComplete="email"
                                  required
                                />
                              </label>
                              <label>
                                Password
                                <input
                                  type="password"
                                  name="password"
                                  minLength={12}
                                  autoComplete="current-password"
                                  required
                                />
                              </label>
                              <div className="button-row spaced">
                                <button
                                  className="primary"
                                  name="action"
                                  value="signin"
                                  disabled={busy}
                                >
                                  Sign in
                                </button>
                                <button
                                  className="secondary"
                                  name="action"
                                  value="signup"
                                  disabled={busy}
                                >
                                  Create account
                                </button>
                              </div>
                            </form>
                          </>
                        ) : (
                          <button
                            className="secondary"
                            onClick={async () => {
                              await browserClient()?.auth.signOut();
                              setToken("");
                              setDemo(true);
                              setData(demoData());
                              setOwner("");
                              setUserId("");
                              notify(
                                "Signed out. You are now viewing synthetic demo records.",
                              );
                            }}
                          >
                            <LogOut size={18} />
                            Sign out
                          </button>
                        )}
                        <div className="info-box spaced">
                          <ShieldCheck />
                          <p>
                            CarePlate is a supportive wellness tool, not a
                            medical device. It does not diagnose, prescribe, or
                            change medication. Follow your established care
                            plan. In an emergency, seek urgent medical help.
                          </p>
                        </div>
                        <h3>Clinician settings</h3>
                        <p>
                          {clinical
                            ? `Your clinician’s plan: ${clinical.action_plan || "No written plan recorded"}. Verified: ${fmt(clinical.verified_at)}.`
                            : "No medical targets or emergency thresholds are assumed. A verified clinician can provision individualized targets, action limits, and a written plan through the protected clinician_settings table. See the deployment guide. App users cannot silently change those settings."}
                        </p>
                      </section>
                    </div>
                  </>
                )}
                {section === "welcome" && (
                  <>
                    {title(
                      "WELCOME TO CAREPLATE",
                      "A little care, every day.",
                      "A simpler way to keep track, enjoy good food, and feel supported.",
                    )}
                    <div className="panel welcome-panel">
                      <span className="welcome-icon">
                        <Leaf size={48} />
                      </span>
                      <h2>Your everyday wellness, together.</h2>
                      <p>
                        1. Record a reading from your meter.
                        <br />
                        2. Find a meal you’ll enjoy and add it to your day.
                        <br />
                        3. Invite someone you trust to lend a hand.
                      </p>
                      <div className="button-row">
                        <Link className="primary" href="/">
                          Explore the demo <ArrowRight size={18} />
                        </Link>
                        <Link className="secondary" href="/settings">
                          Create a private account
                        </Link>
                      </div>
                      <p className="small">
                        Synthetic demo data only. CarePlate supports your
                        routine and conversations with your care team; it does
                        not replace medical advice.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
            <footer>
              <span>
                <Leaf size={15} />A little care, every day.
              </span>
              <p>
                CarePlate is a wellness companion, not medical advice. Always
                follow your care team’s guidance.
              </p>
              <Link href="/settings">Privacy & settings</Link>
            </footer>
          </div>
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          <dialog
            open
            aria-modal="true"
            className="modal"
            aria-labelledby="modal-title"
            ref={(el) => {
              if (el && !el.dataset.focused) {
                el.dataset.focused = "true";
                setTimeout(
                  () => el.querySelector<HTMLElement>("input,button")?.focus(),
                  0,
                );
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setModal("");
              if (e.key === "Tab") {
                const items = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button,input,select,textarea,a[href]",
                );
                const first = items[0],
                  last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setModal("")}
            >
              <X />
            </button>
            <h2 id="modal-title">
              {modal === "glucose"
                ? "Log your glucose"
                : modal === "bp"
                  ? "Log your blood pressure"
                  : modal === "meal"
                    ? "What did you eat?"
                    : modal === "rating"
                      ? "How was your meal?"
                      : "A little inspiration for your plate"}
            </h2>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            {["glucose", "bp"].includes(modal) ? (
              vitalForm(modal)
            ) : modal === "recipe" ? (
              recipeDetail
            ) : modal === "meal" ? (
              <form
                onSubmit={(e) =>
                  submit(e, "meal_logs", (f) => {
                    const r = recipes.find((r) => r.id === f.get("recipe_id"));
                    return {
                      recipe_id: r?.id || null,
                      name: r?.name || String(f.get("custom_name")),
                      servings: Number(f.get("servings")),
                      carbs: r
                        ? r.carbs * Number(f.get("servings"))
                        : Number(f.get("custom_carbs")),
                      recorded_at: new Date(
                        String(f.get("recorded_at")),
                      ).toISOString(),
                      notes: String(f.get("notes")),
                      factors: String(f.get("factors")),
                    };
                  })
                }
              >
                <label>
                  Meal
                  <select
                    name="recipe_id"
                    defaultValue={selected.id}
                    onChange={(e) => setMealSource(e.target.value)}
                  >
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                    <option value="custom">Something else / my own meal</option>
                  </select>
                </label>
                {mealSource === "custom" && (
                  <>
                    <label>
                      Meal name
                      <input name="custom_name" required maxLength={200} />
                    </label>
                    <label>
                      Estimated total carbohydrates eaten (g)
                      <input
                        type="number"
                        name="custom_carbs"
                        min="0"
                        max="2000"
                        step="0.1"
                        required
                      />
                    </label>
                  </>
                )}
                <label>
                  Servings actually eaten
                  <input
                    type="number"
                    step="0.25"
                    name="servings"
                    defaultValue="1"
                    min="0.25"
                    max="20"
                    required
                  />
                </label>
                <label>
                  Date and time
                  <input
                    type="datetime-local"
                    name="recorded_at"
                    defaultValue={localTime()}
                    required
                  />
                </label>
                <label>
                  Meal notes (optional)
                  <textarea name="notes" maxLength={2000} />
                </label>
                <label>
                  Activity, medication timing, stress or illness (optional)
                  <textarea name="factors" maxLength={1000} />
                </label>
                <p className="small">
                  No assumptions are made when context is left blank.
                </p>
                <button className="primary spaced" disabled={busy}>
                  {busy ? "Saving…" : "Save meal"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) =>
                  submit(e, "meal_ratings", (f) => ({
                    meal_id: selectedRecipe,
                    stars: Number(f.get("stars")),
                    enjoyed: f.get("enjoyed") === "on",
                    easy: f.get("easy") === "on",
                    again: f.get("again") === "on",
                  }))
                }
              >
                <label>
                  Your rating
                  <select name="stars" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)} · {n} out of 5
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  ["enjoyed", "I enjoyed it"],
                  ["easy", "It was easy to prepare"],
                  ["again", "I would eat it again"],
                ].map(([k, l]) => (
                  <label className="checkbox-label" key={k}>
                    <input type="checkbox" name={k} defaultChecked />
                    {l}
                  </label>
                ))}
                <p className="small">
                  Taste feedback helps describe your preferences. It is not
                  evidence of medical suitability.
                </p>
                <button className="primary spaced" disabled={busy}>
                  Save my rating
                </button>
              </form>
            )}
          </dialog>
        </div>
      )}
    </div>
  );
  function vitalForm(kind: string) {
    return (
      <form
        onSubmit={(e) =>
          submit(
            e,
            kind === "glucose" ? "glucose_readings" : "blood_pressure_readings",
            (f) =>
              kind === "glucose"
                ? {
                    value: Number(f.get("value")),
                    unit: String(f.get("unit")),
                    context: String(f.get("context")),
                    recorded_at: new Date(
                      String(f.get("recorded_at")),
                    ).toISOString(),
                    meal_id: String(f.get("meal_id") || "") || null,
                    notes: String(f.get("notes") || ""),
                  }
                : {
                    systolic: Number(f.get("systolic")),
                    diastolic: Number(f.get("diastolic")),
                    pulse: Number(f.get("pulse")),
                    recorded_at: new Date(
                      String(f.get("recorded_at")),
                    ).toISOString(),
                    notes: String(f.get("notes") || ""),
                  },
          )
        }
      >
        {demo && (
          <p className="small">
            Synthetic demo only. Use made-up readings; changes stay in this
            browser.
          </p>
        )}
        {kind === "glucose" ? (
          <>
            <div className="form-grid">
              <label>
                Glucose reading
                <input
                  autoFocus
                  type="number"
                  name="value"
                  step={unit === "mmol/L" ? "0.1" : "1"}
                  min="0.1"
                  max={unit === "mmol/L" ? 111 : 2000}
                  placeholder={unit === "mmol/L" ? "e.g. 6.5" : "e.g. 118"}
                  required
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                />
              </label>
              <label>
                Units
                <select
                  name="unit"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setGlucose("");
                  }}
                >
                  <option>mg/dL</option>
                  <option>mmol/L</option>
                </select>
              </label>
            </div>
            {glucose && (
              <p className="conversion">
                Equivalent to approximately{" "}
                {unit === "mmol/L"
                  ? toMg(Number(glucose), unit) + " mg/dL"
                  : toMmol(Number(glucose)) + " mmol/L"}
              </p>
            )}
            <label>
              When was this reading taken?
              <select name="context">
                {contexts.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Related meal (optional, for after-meal readings)
              <select name="meal_id">
                <option value="">Not linked to a meal</option>
                {(data.meal_logs || [])
                  .slice()
                  .reverse()
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {fmt(m.recorded_at)}
                    </option>
                  ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Systolic (top number)
                <input
                  type="number"
                  name="systolic"
                  placeholder="e.g. 124"
                  min="30"
                  max="350"
                  required
                />
              </label>
              <label>
                Diastolic (bottom number)
                <input
                  type="number"
                  name="diastolic"
                  placeholder="e.g. 78"
                  min="20"
                  max="250"
                  required
                />
              </label>
            </div>
            <label>
              Pulse (beats per minute)
              <input
                type="number"
                name="pulse"
                placeholder="e.g. 72"
                min="20"
                max="250"
                required
              />
            </label>
          </>
        )}
        <label>
          Date and time
          <input
            type="datetime-local"
            name="recorded_at"
            defaultValue={localTime()}
            required
          />
        </label>
        <label>
          Notes or symptoms (optional)
          <textarea
            name="notes"
            placeholder="Anything you’d like to remember"
            maxLength={2000}
          />
        </label>
        <div className="small safety-inline">
          If you feel unwell or your meter flags a concerning result, follow
          your established care plan and seek appropriate medical help.
          CarePlate does not monitor emergencies.
        </div>
        <button className="primary full spaced" disabled={busy}>
          {busy
            ? "Saving…"
            : kind === "glucose"
              ? "Save glucose reading"
              : "Save blood pressure"}
          <Check size={18} />
        </button>
      </form>
    );
  }
}
function Vital({
  kind,
  row,
  onLog,
}: {
  kind: string;
  row?: Row;
  onLog: () => void;
}) {
  return (
    <article
      className={
        "vital-card " + (kind === "glucose" ? "glucose-vital" : "bp-vital")
      }
    >
      <div className="vital-top">
        <span
          className={"mini-icon " + (kind === "glucose" ? "peach" : "rose")}
        >
          {kind === "glucose" ? <Droplet size={18} /> : <Heart size={18} />}
        </span>
        <strong>
          {kind === "glucose" ? "Blood glucose" : "Blood pressure"}
        </strong>
        <button aria-label="Add reading" onClick={onLog}>
          <Plus size={18} />
        </button>
      </div>
      <div className="vital-value">
        {row
          ? kind === "glucose"
            ? row.value
            : `${row.systolic}/${row.diastolic}`
          : "—"}
        <span>{kind === "glucose" ? row?.unit || "mg/dL" : "mmHg"}</span>
      </div>
      <div className="vital-context">
        {row
          ? kind === "glucose"
            ? row.context
            : `Pulse ${row.pulse} bpm`
          : "No reading recorded"}
        <span className="recorded-badge">
          <Check size={12} /> {row ? "Recorded" : "Ready to log"}
        </span>
      </div>
      <div className="vital-bottom">
        <Clock size={13} />
        {row ? fmt(row.recorded_at) : "Your latest check-in will appear here"}
      </div>
    </article>
  );
}
function RecordTable({ rows, kind }: { rows: Row[]; kind: string }) {
  return !rows.length ? (
    <p>No readings in this period.</p>
  ) : (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date & time</th>
            <th>Reading</th>
            <th>{kind === "glucose" ? "Context" : "Pulse"}</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .slice()
            .sort(
              (a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at),
            )
            .map((r) => (
              <tr key={r.id}>
                <td>{fmt(r.recorded_at)}</td>
                <td>
                  <strong>
                    {kind === "glucose"
                      ? `${r.value} ${r.unit}`
                      : `${r.systolic}/${r.diastolic} mmHg`}
                  </strong>
                </td>
                <td>{kind === "glucose" ? r.context : `${r.pulse} bpm`}</td>
                <td>{r.notes || "—"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
function GlucoseChart({ readings, days }: { readings: Row[]; days: number }) {
  const rows = readings
    .filter(
      (r) =>
        Date.now() - Date.parse(r.recorded_at) <= days * 86400000 &&
        Date.parse(r.recorded_at) <= Date.now(),
    )
    .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
  if (!rows.length)
    return (
      <p>No readings in this period. Add a reading to start your chart.</p>
    );
  const vals = rows.map((r) => toMg(r.value, r.unit));
  const low = Math.max(0, Math.min(...vals) - 20),
    high = Math.max(...vals) + 20;
  const points = vals
    .map(
      (v, i) =>
        `${45 + (i / Math.max(1, vals.length - 1)) * 810},${190 - ((v - low) / (high - low)) * 155}`,
    )
    .join(" ");
  return (
    <>
      <svg
        className="glucose-chart"
        viewBox="0 0 900 240"
        role="img"
        aria-label={`Glucose readings in the past ${days} days, from ${Math.min(...vals)} to ${Math.max(...vals)} mg/dL. ${rows.length} readings.`}
      >
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="45"
              x2="860"
              y1={35 + i * 52}
              y2={35 + i * 52}
              stroke="#e5e9e3"
            />
            <text x="0" y={40 + i * 52} fill="#53645a" fontSize="14">
              {Math.round(high - (i * (high - low)) / 3)}
            </text>
          </g>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#356a50"
          strokeWidth="3"
        />
        {vals.map((v, i) => (
          <circle
            key={i}
            cx={45 + (i / Math.max(1, vals.length - 1)) * 810}
            cy={190 - ((v - low) / (high - low)) * 155}
            r="5"
            fill="#356a50"
          >
            <title>
              {fmt(rows[i].recorded_at)}: {v} mg/dL
            </title>
          </circle>
        ))}
        <text x="45" y="230" fontSize="14" fill="#53645a">
          {new Date(rows[0].recorded_at).toLocaleDateString()}
        </text>
        <text x="780" y="230" fontSize="14" fill="#53645a">
          {new Date(rows.at(-1)!.recorded_at).toLocaleDateString()}
        </text>
      </svg>
      <p>
        <strong>{rows.length} recorded reading(s)</strong> · Lowest{" "}
        {Math.min(...vals)}, highest {Math.max(...vals)}, average{" "}
        {Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)} mg/dL.
      </p>
    </>
  );
}
function FoodArt({ kind }: { kind: string }) {
  return (
    <svg
      viewBox="0 0 420 330"
      className="plate-art"
      role="img"
      aria-label={
        kind === "oats"
          ? "A bowl of oats with blueberries"
          : kind === "apple"
            ? "Apple slices on a plate"
            : "A bowl of salmon, grains and green vegetables"
      }
    >
      <defs>
        <radialGradient id={"plate-" + kind}>
          <stop offset="0" stopColor="#fffef8" />
          <stop offset=".8" stopColor="#faf8ef" />
          <stop offset="1" stopColor="#e4dfcf" />
        </radialGradient>
        <filter
          id={"shadow-" + kind}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="15"
            stdDeviation="12"
            floodColor="#263d25"
            floodOpacity=".18"
          />
        </filter>
        <linearGradient id={"fish-" + kind} x2="1" y2="1">
          <stop stopColor="#edac78" />
          <stop offset="1" stopColor="#bd5f39" />
        </linearGradient>
      </defs>
      <g transform="rotate(-12 210 165)">
        <ellipse
          cx="212"
          cy="175"
          rx="145"
          ry="133"
          fill={"url(#plate-" + kind + ")"}
          filter={"url(#shadow-" + kind + ")"}
        />
        <ellipse
          cx="212"
          cy="175"
          rx="125"
          ry="113"
          fill={kind === "oats" ? "#d8bc91" : "#e0d4ae"}
        />
        {kind === "oats" ? (
          <>
            {Array.from({ length: 55 }, (_, i) => (
              <ellipse
                key={i}
                cx={110 + ((i * 37) % 205)}
                cy={90 + ((i * 29) % 175)}
                rx="6"
                ry="3"
                fill="#f0dfb8"
                transform={`rotate(${i * 15} ${110 + ((i * 37) % 205)} ${90 + ((i * 29) % 175)})`}
              />
            ))}
            {Array.from({ length: 15 }, (_, i) => (
              <g key={i}>
                <circle
                  cx={160 + ((i * 29) % 130)}
                  cy={115 + ((i * 37) % 125)}
                  r="13"
                  fill={i % 2 ? "#455178" : "#344260"}
                />
                <path
                  d={`M${155 + ((i * 29) % 130)} ${110 + ((i * 37) % 125)}l4 4 4-3`}
                  fill="none"
                  stroke="#8d9ab1"
                  strokeWidth="2"
                />
              </g>
            ))}
          </>
        ) : kind === "apple" ? (
          <>
            {Array.from({ length: 7 }, (_, i) => (
              <path
                key={i}
                d="M215 90 Q320 140 260 258 Q225 200 215 90"
                fill="#f1e4b5"
                stroke="#ad4b3d"
                strokeWidth="7"
                transform={`rotate(${i * 36 - 110} 210 175)`}
              />
            ))}
            <circle cx="210" cy="175" r="36" fill="#b18b58" />
          </>
        ) : (
          <>
            {Array.from({ length: 70 }, (_, i) => (
              <ellipse
                key={i}
                cx={106 + ((i * 37) % 210)}
                cy={87 + ((i * 31) % 180)}
                rx="4"
                ry="2"
                fill={i % 2 ? "#f4e7c4" : "#c3ac77"}
                transform={`rotate(${i * 20} ${106 + ((i * 37) % 210)} ${87 + ((i * 31) % 180)})`}
              />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <g
                key={i}
                transform={`translate(${120 + ((i * 39) % 155)},${90 + ((i * 17) % 80)}) rotate(${i * 43})`}
              >
                <path d="M0 30L-5 0 5 0 3 30" fill="#759449" />
                <circle
                  cx="0"
                  cy="-4"
                  r="19"
                  fill={i % 2 ? "#3d683f" : "#557d43"}
                />
                <circle cx="-12" cy="3" r="12" fill="#719251" />
                <circle cx="12" cy="3" r="12" fill="#456d3f" />
              </g>
            ))}
            <g transform="rotate(25 225 200)">
              <rect
                x="157"
                y="150"
                width="132"
                height="97"
                rx="20"
                fill={"url(#fish-" + kind + ")"}
              />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path
                  key={i}
                  d={`M${164 + i * 22} 154q-12 48 0 88`}
                  fill="none"
                  stroke="#f4c69a"
                  strokeWidth="4"
                />
              ))}
              <path
                d="M165 242h115"
                stroke="#915b37"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {Array.from({ length: 20 }, (_, i) => (
                <circle
                  key={i}
                  cx={167 + ((i * 29) % 112)}
                  cy={160 + ((i * 23) % 72)}
                  r="1.8"
                  fill="#4c6339"
                />
              ))}
            </g>
            <g transform="translate(285 125) rotate(30)">
              <path
                d="M-31 0a31 31 0 0 1 62 0Z"
                fill="#f6d762"
                stroke="#f8eaa7"
                strokeWidth="5"
              />
              <path
                d="M0 0L-15-26M0 0L15-26M0 0V-30"
                stroke="#fff4c8"
                strokeWidth="2"
              />
            </g>
            <path
              d="M120 220q-35-35-34-5t34 5M120 220q-5 40-28 18t28-18"
              fill="#50844f"
            />
          </>
        )}
      </g>
    </svg>
  );
}
