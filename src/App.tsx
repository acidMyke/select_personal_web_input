import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import axios from 'axios';
import Fuse from 'fuse.js';
import './App.css';

const queryClient = new QueryClient();

function App() {

  useEffect(() => {
    window.Telegram.WebApp.ready();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SelectPersonals />
    </QueryClientProvider>
  );
}

interface Personal {
  id: string;
  rank: string;
  name: string;
  appt: string;
  subunit2: string;
}

const sampleJSON =
  '[{"id":"1","rank":"PTE","name":"John Doe","appt":"trooper","subunit2":"1"},{"id":"2","rank":"PTE","name":"Jane Doe","appt":"trooper","subunit2":"1"},{"id":"3","rank":"PTE","name":"John Smith","appt":"trooper","subunit2":"2"},{"id":"4","rank":"PTE","name":"Jane Smith","appt":"trooper","subunit2":"2"},{"id":"5","rank":"3SG","name":"David Doe","appt":"wospec","subunit2":"1"},{"id":"6","rank":"3SG","name":"David Smith","appt":"wospec","subunit2":"2"},{"id":"7","rank":"2LT","name":"Sam Doe","appt":"officer","subunit2":"1"}]';

function SelectPersonals() {
  const id = useMemo(() => {
    const curURL = window.location.href;
    const url = new URL(curURL);
    return url.searchParams.get('id');
  }, []);

  const {
    isLoading,
    error,
    data: personals,
  } = useQuery<Personal[]>(['personals'], () => {
    if (!id) 
      return Promise.resolve(JSON.parse(sampleJSON));
    return axios
      .get(`https://back.4214lut.click/kv-store/${id}`)
      .then(res => res.data);
  });
  const [selectedPersonal, setSelectedPersonal] = useState<string[]>([]);
  const [searchPersonal, setSearchPersonal] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'' | 'rank' | 'appt' | 'subunit2'>('');

  const sendPersonal = useCallback(() => {
    window.Telegram.WebApp.sendData(JSON.stringify({id, identities: selectedPersonal}));
  }, [id, selectedPersonal]);

  // Initialize fuse.js
  const fuse = useMemo(() => {
    if (!personals) return null;
    return new Fuse(personals, {
      keys: ['name'],
      threshold: 0.3,
    });
  }, [personals]);

  if (isLoading || personals == undefined) return <div>Loading...</div>;
  if (error) return <div>Something went wrong</div>;

  const displayPersonals = personals.reduce(
    (acc, p) => {
      if (searchPersonal.length > 0 && !searchPersonal.includes(p.id))
        return acc;
      const v =
        acc[selectedPersonal.includes(p.id) ? 'selected' : 'unselected'];
      const g = groupBy ? p[groupBy] : '';
      if (!v[g]) v[g] = [];
      v[g].push(p);
      return acc;
    },
    {
      selected: {} as Record<string, Personal[]>,
      unselected: {} as Record<string, Personal[]>,
    }
  );

  return (
    <div className='absolute inset-0 p-1 text-left'>
      <div className='container mx-auto flex flex-col justify-start items-start gap-2'>
        <h1 className='text-xl text-bold'>Select Personal</h1>

        <input
          className='border border-gray-300 rounded-md p-2 w-full'
          placeholder='Search'
          onChange={e => {
            const results = fuse
              ?.search(e.target.value)
              .map(result => result.item.id);
            setSearchPersonal(results || []);
          }}
        />
        <select
          className='border border-gray-300 rounded-md p-2 w-full'
          value={groupBy}
          onChange={e => setGroupBy(e.target.value as any)}
        >
          <option value=''>Group By: None</option>
          <option value='rank'>Group By: Rank</option>
          <option value='appt'>Group By: Appointment</option>
          <option value='subunit2'>Group By: Platoon</option>
        </select>

        {Object.entries(displayPersonals.unselected).map(([key, personals]) => (
          <div key={key} className='w-full'>
            <div className='w-full flex justify-between mb-2'>
              <h3 className='text-lg font-bold'>{key}</h3>
              <button
                className='border border-gray-300 text-xs rounded-md p-2 bg-sky-600 text-white'
                onClick={() =>
                  setSelectedPersonal(prev => [
                    ...prev,
                    ...personals.map(personal => personal.id),
                  ])
                }
              >
                Select All
              </button>
            </div>

            <div className='flex flex-col pl-2'>
              {personals.map(personal => (
                <PersonalButton
                  key={personal.id}
                  personal={personal}
                  selected={false}
                  onClick={() =>
                    setSelectedPersonal(prev => [...prev, personal.id])
                  }
                />
              ))}
            </div>
          </div>
        ))}
        {Object.keys(displayPersonals.selected).length > 0 && (
          <>
            <hr className='w-full mt-2' />
            <h2 className='text-xl font-bold text-center block w-full underline'>
              Selected
            </h2>
            {Object.entries(displayPersonals.selected).map(([key, value]) => (
              <div key={key} className='w-full'>
                <div className='w-full flex justify-between mb-2'>
                  <h3 className='text-lg font-bold'>{key}</h3>
                  <button
                    className='border border-gray-300 text-xs rounded-md p-2 bg-sky-600 text-white'
                    onClick={() =>
                      setSelectedPersonal(prev =>
                        prev.filter(id => !value.map(p => p.id).includes(id))
                      )
                    }
                  >
                    Deselect All
                  </button>
                </div>
                <div className='flex flex-col'>
                  {value.map(personal => (
                    <PersonalButton
                      key={personal.id}
                      personal={personal}
                      selected={true}
                      onClick={() =>
                        setSelectedPersonal(prev => {
                          const index = prev.indexOf(personal.id);
                          if (index === -1) return prev;
                          return [
                            ...prev.slice(0, index),
                            ...prev.slice(index + 1),
                          ];
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        <hr className='w-full mt-2' />
        <div className='w-full flex justify-between mb-2'>
          <button
            className='border border-gray-300 rounded-md py-2 px-4 bg-red-600 text-white'
            onClick={() => window.Telegram.WebApp.close()}
          >
            Cancel
          </button>

          <button
            className='border border-gray-300 rounded-md py-2 px-4  bg-sky-600'
            onClick={sendPersonal}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

interface PersonalButtonProps {
  personal: Personal;
  selected: boolean;
  onClick: () => void;
}

function PersonalButton({ personal, selected, onClick }: PersonalButtonProps) {
  return (
    <button
      className={`border border-gray-300 rounded-md p-2 w-full ${
        selected ? 'bg-sky-600' : ''
      }`}
      onClick={onClick}
    >
      <p className='text-lg font-bold text-left'>
        {personal.rank} {personal.name}
      </p>
      <p className='text-left'>
        Appointment: {personal.appt}, Platoon: {personal.subunit2}
      </p>
    </button>
  );
}

export default App;
