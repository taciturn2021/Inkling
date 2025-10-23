'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LabelFilters from '@/components/LabelFilters';
import NoteList from '@/components/NoteList';

import FloatingActionButton from '@/components/FloatingActionButton';
import LabelManager from '@/components/LabelManager';




type Label = { _id: string; name: string; color: string };
type Note = { _id: string; title?: string; content: string; labels: Label[] };

export default function DashboardPage() {

  const [notes, setNotes] = useState<Note[]>([]);

  const [labels, setLabels] = useState<Label[]>([]);

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState<boolean>(false);



  const fetchNotesAndLabels = async () => {

    setLoading(true);

    try {

      const [notesRes, labelsRes] = await Promise.all([

        fetch(selectedLabel ? `/api/notes?labelId=${selectedLabel}` : '/api/notes'),

        fetch('/api/labels'),

      ]);

      const notesData = await notesRes.json();

      const labelsData = await labelsRes.json();

      setNotes(notesData);

      setLabels(labelsData);

    } catch (error) {

      console.error('Failed to fetch data', error);

    }

    setLoading(false);

  };



  useEffect(() => {

    fetchNotesAndLabels();

  }, [selectedLabel]);



  const handleLabelsUpdate = () => {

    fetchNotesAndLabels();

  };



  return (

    <div className="min-h-screen bg-gray-900 text-white">

      <Header onManageLabels={() => setIsLabelManagerOpen(true)} />

      <LabelFilters

        labels={labels}

        selectedLabel={selectedLabel}

        onSelectLabel={setSelectedLabel}

      />

      

            {loading ? (

              <div className="flex justify-center items-center h-64">

                <p>Loading...</p>

              </div>

            ) : notes.length > 0 ? (

              <NoteList notes={notes} />

            ) : (

              <div className="text-center py-16">

                <h2 className="text-2xl font-semibold mb-4">Welcome to your notes!</h2>

                <p className="text-gray-400">You don't have any notes yet. Click the '+' button to create your first note.</p>

              </div>

            )}

      

      <FloatingActionButton />

      <LabelManager 

        isOpen={isLabelManagerOpen} 

        onClose={() => setIsLabelManagerOpen(false)} 

        onLabelsUpdate={handleLabelsUpdate} 

      />

    </div>

  );

}
