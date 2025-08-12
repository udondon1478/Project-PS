"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagEditorProps {
  initialTags: { id: string; name: string; }[];
  onTagsChange: (newTags: { id: string; name: string; }[]) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ initialTags, onTagsChange }) => {
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState('');

  const handleAddTag = () => {
    if (newTagName.trim() !== '' && !tags.some(tag => tag.name === newTagName.trim())) {
      const newTag = { id: `temp-${Date.now()}`, name: newTagName.trim() }; // 仮のIDを付与
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      onTagsChange(updatedTags);
      setNewTagName('');
    }
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = tags.filter(tag => tag.id !== tagId);
    setTags(updatedTags);
    onTagsChange(updatedTags);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center bg-blue-100 rounded-full px-3 py-1 text-sm font-semibold text-blue-800">
            <span>{tag.name}</span>
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-2 text-blue-600 hover:text-blue-900 focus:outline-none"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="新しいタグを追加"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddTag();
            }
          }}
        />
        <Button onClick={handleAddTag}>追加</Button>
      </div>
    </div>
  );
};

export default TagEditor;