import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import { supabaseService } from '../../services/supabaseService';
import QuestionEditor from '../../components/host/QuestionEditor';
import SlideEditor from '../../components/host/SlideEditor';
import BackgroundSelector from '../../components/host/BackgroundSelector';

const CreateQuiz = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editQuizId = searchParams.get('edit');
  
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    background_type: 'gradient',
    background_value: 'linear-gradient(135deg, #46178F 0%, #1368CE 100%)',
    background_overlay: true,
    overlay_opacity: 0.4,
  });
  
  const [quizItems, setQuizItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);

  // Load quiz for editing
  useEffect(() => {
    if (editQuizId) {
      loadQuizForEditing(editQuizId);
    }
  }, [editQuizId]);

  const loadQuizForEditing = async (quizId) => {
    try {
      setIsLoading(true);
      const quizData = await supabaseService.getQuiz(quizId);
      
      if (quizData) {
        setQuiz({
          id: quizData.id,
          title: quizData.title || '',
          description: quizData.description || '',
          background_type: quizData.background_type || 'gradient',
          background_value: quizData.background_value || 'linear-gradient(135deg, #46178F 0%, #1368CE 100%)',
          background_overlay: quizData.background_overlay ?? true,
          overlay_opacity: quizData.overlay_opacity ?? 0.4,
        });
        
        const items = quizData.quiz_items || [];
        const sortedItems = items.sort((a, b) => a.order_index - b.order_index);
        setQuizItems(sortedItems);
        
        if (sortedItems.length > 0) {
          setSelectedItemIndex(0);
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizChange = (field, value) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  const addQuizItem = (type = 'question') => {
    const newItem = {
      id: `temp_${Date.now()}`,
      item_type: type,
      question_type: type === 'question' ? 'multiple_choice' : null,
      order_index: quizItems.length,
      title: '',
      content: type === 'question' ? 'New Question' : 'New Slide',
      media_url: null,
      media_type: null,
      font_size: 'auto',
      is_scored: type === 'question',
      is_double_points: false,
      time_limit: 30,
      points: 1000,
      presenter_notes: '',
      quiz_item_options: type === 'question' ? [
        { option_text: 'Option A', is_correct: true, option_index: 0 },
        { option_text: 'Option B', is_correct: false, option_index: 1 },
        { option_text: 'Option C', is_correct: false, option_index: 2 },
        { option_text: 'Option D', is_correct: false, option_index: 3 },
      ] : [],
    };

    setQuizItems(prev => [...prev, newItem]);
    setSelectedItemIndex(quizItems.length);
  };

  const updateQuizItem = (index, updates) => {
    setQuizItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const deleteQuizItem = (index) => {
    if (quizItems.length <= 1) {
      toast.error('Quiz must have at least one item');
      return;
    }

    setQuizItems(prev => prev.filter((_, i) => i !== index));
    
    // Adjust selected index
    if (selectedItemIndex >= index) {
      setSelectedItemIndex(Math.max(0, selectedItemIndex - 1));
    }
  };

  const duplicateQuizItem = (index) => {
    const itemToDuplicate = quizItems[index];
    const duplicatedItem = {
      ...itemToDuplicate,
      id: `temp_${Date.now()}`,
      order_index: quizItems.length,
      title: `${itemToDuplicate.title} (Copy)`,
      content: `${itemToDuplicate.content} (Copy)`,
    };

    setQuizItems(prev => [...prev, duplicatedItem]);
    setSelectedItemIndex(quizItems.length);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(quizItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order indices
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    setQuizItems(updatedItems);

    // Update selected index if needed
    if (selectedItemIndex === result.source.index) {
      setSelectedItemIndex(result.destination.index);
    }
  };

  const saveQuiz = async () => {
    if (!quiz.title.trim()) {
      toast.error('Quiz title is required');
      return;
    }

    if (quizItems.length === 0) {
      toast.error('Quiz must have at least one question or slide');
      return;
    }

    try {
      setIsSaving(true);

      let savedQuiz;
      if (quiz.id) {
        // Update existing quiz
        savedQuiz = await supabaseService.updateQuiz(quiz.id, {
          title: quiz.title.trim(),
          description: quiz.description.trim() || null,
          background_type: quiz.background_type,
          background_value: quiz.background_value,
          background_overlay: quiz.background_overlay,
          overlay_opacity: quiz.overlay_opacity,
        });
      } else {
        // Create new quiz
        savedQuiz = await supabaseService.createQuiz({
          title: quiz.title.trim(),
          description: quiz.description.trim() || null,
          host_id: 'temp-host-id', // TODO: Get from auth
          background_type: quiz.background_type,
          background_value: quiz.background_value,
          background_overlay: quiz.background_overlay,
          overlay_opacity: quiz.overlay_opacity,
        });
      }

      if (!savedQuiz) {
        throw new Error('Failed to save quiz');
      }

      // Save quiz items
      for (let i = 0; i < quizItems.length; i++) {
        const item = quizItems[i];
        const itemData = {
          quiz_id: savedQuiz.id,
          item_type: item.item_type,
          question_type: item.question_type,
          order_index: i,
          title: item.title,
          content: item.content,
          media_url: item.media_url,
          media_type: item.media_type,
          font_size: item.font_size,
          is_scored: item.is_scored,
          is_double_points: item.is_double_points,
          time_limit: item.time_limit,
          points: item.points,
          presenter_notes: item.presenter_notes,
        };

        let savedItem;
        if (item.id && !item.id.startsWith('temp_')) {
          // Update existing item
          savedItem = await supabaseService.updateQuizItem(item.id, itemData);
        } else {
          // Create new item
          savedItem = await supabaseService.createQuizItem(itemData);
        }

        // Save options for questions
        if (item.item_type === 'question' && item.quiz_item_options) {
          await supabaseService.updateQuizItemOptions(savedItem.id, item.quiz_item_options);
        }
      }

      toast.success(quiz.id ? 'Quiz updated successfully!' : 'Quiz created successfully!');
      navigate('/host');

    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const testQuiz = () => {
    if (!quiz.title.trim()) {
      toast.error('Please add a quiz title first');
      return;
    }

    if (quizItems.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    // TODO: Implement quiz preview/test mode
    toast.success('Quiz test mode coming soon!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const selectedItem = selectedItemIndex !== null ? quizItems[selectedItemIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/host')}
                className="text-gray-600 hover:text-gray-800 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {quiz.id ? 'Edit Quiz' : 'Create Quiz'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBackgroundSelector(true)}
                className="quizgo-button quizgo-button-secondary px-4 py-2 text-sm"
              >
                Background
              </button>
              
              <button
                onClick={testQuiz}
                className="quizgo-button quizgo-button-secondary px-4 py-2 text-sm"
                disabled={isSaving}
              >
                Test
              </button>
              
              <button
                onClick={saveQuiz}
                className="quizgo-button quizgo-button-primary px-6 py-2 text-sm"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quiz Settings */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Quiz Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => handleQuizChange('title', e.target.value)}
                placeholder="Enter quiz title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={quiz.description}
                onChange={(e) => handleQuizChange('description', e.target.value)}
                placeholder="Brief description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={200}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Item List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Quiz Items ({quizItems.length})</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => addQuizItem('question')}
                    className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                  >
                    + Question
                  </button>
                  <button
                    onClick={() => addQuizItem('slide')}
                    className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                  >
                    + Slide
                  </button>
                </div>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="quiz-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {quizItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedItemIndex === index
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                              onClick={() => setSelectedItemIndex(index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mr-2 text-gray-400 hover:text-gray-600"
                                  >
                                    ⋮⋮
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <span className={`text-xs px-2 py-1 rounded mr-2 ${
                                        item.item_type === 'question'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {item.item_type === 'question' ? 'Q' : 'S'}
                                      </span>
                                      
                                      {item.is_double_points && (
                                        <span className="text-xs text-yellow-600 mr-2">⚡</span>
                                      )}
                                      
                                      <span className="text-sm font-medium truncate">
                                        {item.title || item.content || 'Untitled'}
                                      </span>
                                    </div>
                                    
                                    {item.question_type && item.question_type !== 'multiple_choice' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {item.question_type.replace('_', ' ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateQuizItem(index);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 p-1"
                                    title="Duplicate"
                                  >
                                    📋
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteQuizItem(index);
                                    }}
                                    className="text-gray-400 hover:text-red-600 p-1"
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {quizItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No items yet</p>
                  <button
                    onClick={() => addQuizItem('question')}
                    className="quizgo-button quizgo-button-primary"
                  >
                    Add First Question
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Item Editor */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <div className="bg-white rounded-lg shadow">
                {selectedItem.item_type === 'question' ? (
                  <QuestionEditor
                    question={selectedItem}
                    onChange={(updates) => updateQuizItem(selectedItemIndex, updates)}
                  />
                ) : (
                  <SlideEditor
                    slide={selectedItem}
                    onChange={(updates) => updateQuizItem(selectedItemIndex, updates)}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p className="mb-4">Select an item to edit</p>
                <p className="text-sm">Choose a question or slide from the list to start editing</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background Selector Modal */}
      {showBackgroundSelector && (
        <BackgroundSelector
          currentBackground={{
            type: quiz.background_type,
            value: quiz.background_value,
            overlay: quiz.background_overlay,
            opacity: quiz.overlay_opacity,
          }}
          onSelect={(background) => {
            handleQuizChange('background_type', background.type);
            handleQuizChange('background_value', background.value);
            handleQuizChange('background_overlay', background.overlay);
            handleQuizChange('overlay_opacity', background.opacity);
            setShowBackgroundSelector(false);
          }}
          onClose={() => setShowBackgroundSelector(false)}
        />
      )}
    </div>
  );
};

export default CreateQuiz;