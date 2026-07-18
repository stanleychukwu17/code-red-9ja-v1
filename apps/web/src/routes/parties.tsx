import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Search, Users, ChevronRight, Flag } from 'lucide-react';
import { APP_URL } from '#/lib/config';

export const Route = createFileRoute('/parties')({
  component: PartiesComponent,
})

const MOCK_PARTIES = [
  {
    id: 1,
    name: 'All Progressives Congress',
    acronym: 'APC',
    color: 'bg-green-600',
    textColor: 'text-green-600',
    members: '12.5M',
    founded: '2013',
    description: 'The All Progressives Congress is a major contemporary political party in Nigeria.',
  },
  {
    id: 2,
    name: 'Peoples Democratic Party',
    acronym: 'PDP',
    color: 'bg-red-600',
    textColor: 'text-red-600',
    members: '10.2M',
    founded: '1998',
    description: 'The Peoples Democratic Party is a major contemporary political party in Nigeria.',
  },
  {
    id: 3,
    name: 'Labour Party',
    acronym: 'LP',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    members: '8.4M',
    founded: '2002',
    description: 'A social democratic political party in Nigeria.',
  },
  {
    id: 4,
    name: 'New Nigeria Peoples Party',
    acronym: 'NNPP',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    members: '3.1M',
    founded: '2001',
    description: 'A national political party in Nigeria.',
  },
  {
    id: 5,
    name: 'All Progressives Grand Alliance',
    acronym: 'APGA',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    members: '1.8M',
    founded: '2003',
    description: 'A political party in Nigeria.',
  },
  {
    id: 6,
    name: 'Social Democratic Party',
    acronym: 'SDP',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    members: '1.2M',
    founded: '1989',
    description: 'A center-left political party in Nigeria.',
  },
];

function PartiesComponent() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParties = MOCK_PARTIES.filter((party) =>
    party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.acronym.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Political Parties
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-lg">
              Explore and learn about all registered political parties in Nigeria.
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search parties..."
              className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Grid Section */}
        {filteredParties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParties.map((party) => (
              <Link
                key={party.id}
                to={APP_URL.party(party.acronym.toLowerCase(), party.id.toString())}
                className="group flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Card Header with Color Banner */}
                <div className={`h-2 ${party.color} w-full`} />
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${party.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center shadow-sm`}>
                      <span className={`text-xl font-bold ${party.textColor}`}>
                        {party.acronym}
                      </span>
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      Est. {party.founded}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors duration-200">
                    {party.name}
                  </h3>
                  
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 flex-1 line-clamp-2">
                    {party.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                      <Users className="w-4 h-4 mr-1.5" />
                      {party.members} Members
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
              <Flag className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">No parties found</h3>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
              We couldn't find any political parties matching "{searchQuery}". Try adjusting your search.
            </p>
          </div>
        )}
        
      </div>
    </div>
  )
}
