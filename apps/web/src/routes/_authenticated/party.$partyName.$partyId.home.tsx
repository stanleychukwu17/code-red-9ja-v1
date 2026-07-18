import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Users, UserPlus, Check, Star, MapPin } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/party/$partyName/$partyId/home')({
  component: PartyHomeComponent,
})

function PartyHomeComponent() {
  const { partyName, partyId } = Route.useParams()
  
  const [isMember, setIsMember] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Formatting party name for display
  const displayPartyName = partyName.toUpperCase();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-12">
      {/* Hero Cover Section */}
      <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        <img 
          src="https://plus.unsplash.com/premium_photo-1708022614998-a0d2083a58d8?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Party Cover" 
          className="w-full h-full object-cover absolute inset-0"
        />
      </div>

      {/* Profile Info Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-24 mb-8 z-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">

            {/* Profile Picture and Title */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 flex-1">
              {/* Rounded Profile Picture */}
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-neutral-950 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden flex-shrink-0 relative z-10">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-primary">
                    {displayPartyName.slice(0, 3)}
                  </span>
                </div>
              </div>

              <div className="pb-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  {displayPartyName}
                  <div className="bg-blue-500 rounded-full p-1 w-6 h-6 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-4 text-sm sm:text-base font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Abuja, Nigeria
                  </span>
                  <span>•</span>
                  <span>ID: {partyId}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pb-2 w-full sm:w-auto mt-4 sm:mt-0">
              {/* Follow Button */}
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all duration-200 ${
                  isFollowing 
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-105 active:scale-95 shadow-md hover:shadow-xl'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
              
              {/* Membership Button */}
              <button
                onClick={() => setIsMember(!isMember)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all duration-200 ${
                  isMember 
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg'
                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-white dark:bg-primary/20'
                }`}
              >
                {isMember ? (
                  <>
                    <Star className="w-4 h-4 fill-current" />
                    Member
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Join Party
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Tabs (Mock) */}
        <div className="mt-8">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-8 overflow-x-auto hide-scrollbar">
            {['Home', 'About', 'Candidates', 'Manifesto', 'Updates'].map((tab, i) => (
              <button 
                key={tab}
                className={`pb-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  i === 0 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Mock Feed Post */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">Welcome to {displayPartyName}</h3>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  We are excited to have you here! Our party is dedicated to moving the nation forward through sustainable policies and transparent governance. Stay tuned for updates on our candidates and upcoming events in your area.
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* About Widget */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">About</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-4">
                  The official page for {displayPartyName}. Join the movement for a better tomorrow.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-neutral-500">
                    <Users className="w-4 h-4 mr-3" />
                    <span className="font-medium text-neutral-900 dark:text-white">12.5M</span>&nbsp;Members
                  </div>
                  <div className="flex items-center text-neutral-500">
                    <Star className="w-4 h-4 mr-3" />
                    <span className="font-medium text-neutral-900 dark:text-white">2.1M</span>&nbsp;Followers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
