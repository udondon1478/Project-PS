"use client";

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Tag {
  id: string;
  name: string;
}

interface TagWithState extends Tag {
  state: 'kept' | 'added' | 'removed';
}

interface TagEditorProps {
  initialTags: Tag[];
  onTagsChange: (data: { tags: Tag[], comment: string }) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ initialTags, onTagsChange }) => {
  const [tags, setTags] = useState<TagWithState[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    setTags(initialTags.map(tag => ({ ...tag, state: 'kept' })));
  }, [initialTags]);

  const handleAddTag = () => {
    if (newTagName.trim() !== '' && !tags.some(tag => tag.name === newTagName.trim() && tag.state !== 'removed')) {
      const existingTag = tags.find(tag => tag.name === newTagName.trim() && tag.state === 'removed');
      if (existingTag) {
        setTags(tags.map(tag => tag.id === existingTag.id ? { ...tag, state: 'kept' } : tag));
      } else {
        const newTag: TagWithState = { id: `temp-${Date.now()}`, name: newTagName.trim(), state: 'added' };
        setTags([...tags, newTag]);
      }
      setNewTagName('');
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.map(tag => {
      if (tag.id === tagId) {
        return { ...tag, state: tag.state === 'added' ? 'removed' : 'removed' };
      }
      return tag;
    }));
  };
  
  const handleUndoRemove = (tagId: string) => {
    setTags(tags.map(tag => {
      if (tag.id === tagId) {
        const wasOriginallyKept = initialTags.some(initialTag => initialTag.id === tagId);
        return { ...tag, state: wasOriginallyKept ? 'kept' : 'added' };
      }
      return tag;
    }));
  };

  const handleConfirm = () => {
    const finalTags = tags.filter(tag => tag.state !== 'removed').map(({ id, name }) => ({ id, name }));
    onTagsChange({ tags: finalTags, comment });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          if (tag.state === 'removed') {
            return (
              <div key={tag.id} className="flex items-center bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-500">
                <span className="line-through">{tag.name}</span>
                <button
                  onClick={() => handleUndoRemove(tag.id)}
                  className="ml-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  取り消し
                </button>
              </div>
            );
          }
          return (
            <div key={tag.id} className={`flex items-center rounded-full px-3 py-1 text-sm font-semibold ${tag.state === 'added' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
              <span>{tag.name}</span>
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-2 text-red-600 hover:text-red-900 focus:outline-none"
              >
                &times;
              </button>
            </div>
          );
        })}
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
      <div className="grid w-full gap-1.5">
        <Label htmlFor="comment">編集コメント (任意)</Label>
        <Textarea
          id="comment"
          placeholder="この編集についてのコメントを残せます。"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleConfirm}>確定</Button>
      </div>
    </div>
  );
};

export default TagEditor;