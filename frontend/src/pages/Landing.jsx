import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Scroll to section helper
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-surface-100 font-sans text-surface-800 flex flex-col">
      {/* 1. Navbar */}
      <nav className="h-16 flex items-center justify-between px-6 lg:px-12 border-b border-surface-200 bg-surface-50/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 flex items-center justify-center bg-transparent">
            <img src="/logo.png" alt="TaskFlow AI" className="h-full w-auto object-contain" />
          </div>
          <span className="font-bold text-surface-900 tracking-tight text-lg">TaskFlow</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-surface-500">
          <button onClick={() => scrollTo('features')} className="hover:text-surface-900 transition-colors">Features</button>
          <button onClick={() => scrollTo('how-it-works')} className="hover:text-surface-900 transition-colors">How it Works</button>
          <button onClick={() => scrollTo('about')} className="hover:text-surface-900 transition-colors">About</button>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => window.location.reload()} className="btn btn-primary">Go to Dashboard</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost text-surface-600">Login</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="pt-24 pb-20 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-surface-900 leading-tight tracking-tight">
              Manage Projects <br/>
              <span className="text-primary-600">Smarter with AI</span>
            </h1>
            <p className="text-lg text-surface-500 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              TaskFlow AI helps your team organize workflows, predict delays, and ship products faster with deep, AI-driven insights directly integrated into your Agile process.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
              <Link to="/signup" className="btn btn-primary px-6 py-3 text-base">Get Started</Link>
              <Link to="/login" className="btn btn-secondary px-6 py-3 text-base">Login</Link>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-200 to-accent-teal/20 blur-3xl opacity-30 rounded-full"></div>
            {/* Abstract Kanban Mockup */}
            <div className="relative glass-card p-6 border border-surface-200 bg-surface-50 shadow-2xl rounded-2xl overflow-hidden flex flex-col gap-4">
              <div className="flex gap-2 mb-2 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-auto w-1/3 h-6 bg-surface-100 rounded-md"></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {/* Column 1 */}
                <div className="bg-surface-100 rounded-xl p-3 flex flex-col gap-3 min-h-[300px]">
                  <div className="flex items-center justify-between"><div className="w-16 h-4 bg-surface-300 rounded"></div><span className="text-xs text-surface-400 font-medium">3</span></div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-200 shadow-sm space-y-2">
                    <div className="w-full h-3 bg-surface-200 rounded"></div>
                    <div className="w-2/3 h-3 bg-surface-200 rounded"></div>
                    <div className="flex justify-between pt-2">
                       <div className="w-10 h-4 bg-primary-100 rounded"></div>
                       <div className="w-4 h-4 bg-primary-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-200 shadow-sm space-y-2">
                    <div className="w-full h-3 bg-surface-200 rounded"></div>
                    <div className="flex justify-between pt-2">
                       <div className="w-12 h-4 bg-amber-100 rounded"></div>
                    </div>
                  </div>
                </div>
                {/* Column 2 */}
                <div className="bg-primary-50/50 border border-primary-100/50 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between"><div className="w-24 h-4 bg-primary-300 rounded"></div><span className="text-xs text-primary-500 font-medium">1</span></div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-primary-200 shadow-sm space-y-2 relative overflow-hidden group">
                    <div className="w-full h-3 bg-surface-200 rounded"></div>
                    <div className="w-3/4 h-3 bg-surface-200 rounded"></div>
                    <div className="absolute top-0 right-0 bg-primary-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl-lg font-bold">AI Insight</div>
                  </div>
                </div>
                {/* Column 3 */}
                <div className="bg-surface-100 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between"><div className="w-16 h-4 bg-surface-300 rounded"></div><span className="text-xs text-surface-400 font-medium">5</span></div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-200 shadow-sm space-y-2 opacity-60">
                    <div className="w-5/6 h-3 bg-surface-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Features Section */}
        <section id="features" className="py-20 bg-surface-50 border-y border-surface-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-surface-900 mb-4">Everything you need to ship faster</h2>
              <p className="text-surface-500 text-lg">TaskFlow merges beautiful design with powerful AI capabilities to eliminate friction and keep your team fully synchronized.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>}
                title="AI Task Suggestions"
                desc="Our AI automatically predicts task delays, highlights workflow bottleneck risks, and helps break down complex tasks instantly."
              />
              <FeatureCard 
                icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>}
                title="Kanban Board"
                desc="Visualize work and optimize your path to delivery with our silky-smooth, interactive drag-and-drop column boards."
              />
              <FeatureCard 
                icon={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>}
                title="Real-time Updates"
                desc="Zero refresh required. Your entire workspace stays completely in sync instantly via secure Server-Sent Events architecture."
              />
              <FeatureCard 
                icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                title="Team Collaboration"
                desc="Maintain total control with role-based secure workspaces, contextual threaded task comments, and instant notifications."
              />
              <FeatureCard 
                icon={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>}
                title="Smart Scheduling"
                desc="Group tasks into intensive agile sprints, track momentum using live burndown charts, and view global calendars."
              />
              <FeatureCard 
                icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
                title="Analytics"
                desc="Gain an overhead view of your project's health with deep performance metrics and automated project burndown analysis."
              />
            </div>
          </div>
        </section>

        {/* 4. How It Works */}
        <section id="how-it-works" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-surface-900 mb-4">How it works</h2>
            <p className="text-surface-500 text-lg">Go from pure chaos to perfect clarity in three fast steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard step="1" title="Create Workspace" desc="Invite your team members via secure email links and build your very first structured agile project." />
            <StepCard step="2" title="Add Tasks & Sprints" desc="Plot your backlog items, set accurate story points, specify deadlines, and formally launch your sprint." />
            <StepCard step="3" title="AI Optimizes Workflow" desc="Let the Taskflow AI Engine track patterns in the background to notify your team of risks long before they happen." />
          </div>
        </section>

        {/* 5. About Section */}
        <section id="about" className="py-20 bg-surface-50 border-t border-surface-200">
           <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
              <h2 className="text-2xl font-bold text-surface-900 tracking-tight">Built for High-Performance Teams</h2>
              <p className="text-surface-500 text-lg leading-relaxed">
                We constructed TaskFlow AI because modern teams shouldn't have to fight their own project management tools. Administrative overhead slows down brilliant engineers and creators. By combining a phenomenally clean SaaS interface with embedded artificial intelligence, TaskFlow removes the friction so you can focus strictly on what matters: delivering world-class products.
              </p>
           </div>
        </section>

        {/* 6. CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto bg-primary-50 rounded-[2rem] border border-primary-100 p-12 text-center text-primary-900 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Start managing your workflow today</h2>
              <p className="text-primary-700 text-lg max-w-xl mx-auto">Join the teams utilizing TaskFlow's AI-enhanced environment to revolutionize their day-to-day productivity.</p>
              <div className="flex justify-center gap-4 pt-4">
                <Link to="/signup" className="btn btn-primary px-8 py-3 text-base shadow-xl shadow-primary-500/20 hover:scale-105 transition-transform">Get Started</Link>
                <Link to="/login" className="btn bg-white text-surface-800 border-none hover:bg-surface-100 px-8 py-3 text-base shadow-sm">Login</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="bg-surface-50 border-t border-surface-200 pt-16 pb-8 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          {/* Branding */}
          <div className="flex items-center gap-3">
             <div className="h-8 flex items-center justify-center bg-transparent grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
                <img src="/logo.png" alt="TaskFlow AI" className="h-full w-auto object-contain" />
             </div>
             <div>
               <span className="font-bold text-surface-800 tracking-tight text-lg leading-none block">TaskFlow</span>
               <span className="text-surface-400 text-xs font-medium">Intelligent Workspaces</span>
             </div>
          </div>
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm font-medium text-surface-500">
            <button onClick={() => scrollTo('features')} className="hover:text-surface-900 transition-colors">Features</button>
            <button onClick={() => scrollTo('about')} className="hover:text-surface-900 transition-colors">About</button>
            <Link to="/signup" className="hover:text-surface-900 transition-colors">Contact</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-surface-200 text-center md:text-left text-sm text-surface-400">
          © {new Date().getFullYear()} TaskFlow AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

// Sub-components
const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-card-hover p-6 bg-surface-50 group">
    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-surface-900 mb-2">{title}</h3>
    <p className="text-surface-500 leading-relaxed text-sm">{desc}</p>
  </div>
);

const StepCard = ({ step, title, desc }) => (
  <div className="flex flex-col items-center text-center p-6 space-y-4 relative">
    <div className="w-16 h-16 rounded-2xl bg-surface-50 border-2 border-surface-200 shadow-sm flex items-center justify-center text-2xl font-bold text-primary-600 z-10">
      {step}
    </div>
    <h3 className="text-xl font-semibold text-surface-900">{title}</h3>
    <p className="text-surface-500 text-sm leading-relaxed max-w-xs">{desc}</p>
  </div>
);

export default Landing;
