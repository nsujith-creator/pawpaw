'use client'

import { useId, useState } from 'react'
import {
  changeBlockType,
  createBlock,
  isBlockNonEmpty,
  isEditableBlock,
  moveBlock,
  parseAdvancedBlocks,
  removeBlock,
  type EditableBlockType,
} from '@/lib/content/block-editor'
import type { ContentBlock } from '@/lib/content/schema'
import styles from '@/app/admin/admin.module.css'

interface Props {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  error?: string
}

function blockName(block: ContentBlock): string {
  if (block.type === 'media') return 'Media placement'
  if (block.type === 'heading' && block.level === 1) return 'Level 1 heading'
  return block.type
}

export default function BlockEditor({ blocks, onChange, error }: Props) {
  const id = useId()
  const [advanced, setAdvanced] = useState(false)
  const [advancedValue, setAdvancedValue] = useState(() => JSON.stringify(blocks, null, 2))
  const [advancedError, setAdvancedError] = useState('')

  function update(index: number, block: ContentBlock) {
    const next = blocks.map((item, itemIndex) => itemIndex === index ? block : item)
    onChange(next)
    setAdvancedValue(JSON.stringify(next, null, 2))
  }

  function add(type: EditableBlockType) {
    const next = [...blocks, createBlock(type)]
    onChange(next)
    setAdvancedValue(JSON.stringify(next, null, 2))
  }

  function changeType(index: number, type: EditableBlockType) {
    const current = blocks[index]
    if (current.type === 'quote' && current.attribution?.trim() && type !== 'quote' &&
        !window.confirm('Changing this quote type removes its attribution. Continue?')) return
    const changed = changeBlockType(current, type)
    if (changed) update(index, changed)
  }

  function remove(index: number) {
    if (isBlockNonEmpty(blocks[index]) &&
        !window.confirm('Remove this non-empty copy block?')) return
    const next = removeBlock(blocks, index)
    onChange(next)
    setAdvancedValue(JSON.stringify(next, null, 2))
  }

  function move(index: number, direction: 'earlier' | 'later') {
    const next = moveBlock(blocks, index, direction)
    onChange(next)
    setAdvancedValue(JSON.stringify(next, null, 2))
  }

  function openAdvanced() {
    setAdvancedValue(JSON.stringify(blocks, null, 2))
    setAdvancedError('')
    setAdvanced(true)
  }

  function applyAdvanced() {
    const result = parseAdvancedBlocks(advancedValue)
    if ('error' in result) {
      setAdvancedError(result.error)
      return
    }
    onChange(result.blocks)
    setAdvancedError('')
    setAdvanced(false)
  }

  return (
    <fieldset className={styles.blockEditor} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={styles.fieldLabel}>Structured copy</legend>
      <p className={styles.help}>
        Build the chapter with headings, paragraphs, and quotations. Photographs are managed separately below.
      </p>

      {blocks.length === 0 ? (
        <p className={styles.emptyState}>No copy blocks yet. A draft may be saved without copy.</p>
      ) : (
        <ol className={styles.blockList}>
          {blocks.map((block, index) => {
            const editable = isEditableBlock(block)
            return (
              <li key={`${index}-${block.type}`} className={styles.blockCard}>
                <div className={styles.blockHeader}>
                  <span className={styles.recordType}>Block {index + 1}</span>
                  <div className={styles.blockMoveActions}>
                    <button type="button" className={styles.secondaryAction} disabled={index === 0} onClick={() => move(index, 'earlier')}>Move earlier</button>
                    <button type="button" className={styles.secondaryAction} disabled={index === blocks.length - 1} onClick={() => move(index, 'later')}>Move later</button>
                  </div>
                </div>

                {!editable ? (
                  <div className={styles.warningNotice}>
                    <strong>Protected {blockName(block)} block.</strong>{' '}
                    This valid advanced block is preserved exactly and can be reordered, but the simple editor will not flatten or delete it. Use the advanced JSON escape hatch only if you need to edit it.
                  </div>
                ) : (
                  <>
                    <div className={styles.fieldGroup}>
                      <label htmlFor={`${id}-type-${index}`} className={styles.fieldLabel}>Block type</label>
                      <select
                        id={`${id}-type-${index}`}
                        className={styles.select}
                        value={block.type}
                        onChange={event => changeType(index, event.target.value as EditableBlockType)}
                      >
                        <option value="heading">Heading</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="quote">Quote</option>
                      </select>
                    </div>

                    {block.type === 'heading' && (
                      <div className={styles.fieldGroup}>
                        <label htmlFor={`${id}-level-${index}`} className={styles.fieldLabel}>Heading level</label>
                        <select
                          id={`${id}-level-${index}`}
                          className={styles.select}
                          value={block.level}
                          onChange={event => update(index, { ...block, level: Number(event.target.value) as 2 | 3 })}
                        >
                          <option value="2">Heading 2</option>
                          <option value="3">Heading 3</option>
                        </select>
                      </div>
                    )}

                    <div className={styles.fieldGroup}>
                      <label htmlFor={`${id}-text-${index}`} className={styles.fieldLabel}>
                        {block.type === 'quote' ? 'Quotation' : block.type === 'heading' ? 'Heading text' : 'Paragraph'}
                      </label>
                      <textarea
                        id={`${id}-text-${index}`}
                        className={styles.blockTextarea}
                        rows={block.type === 'heading' ? 2 : 5}
                        value={block.text}
                        onChange={event => update(index, { ...block, text: event.target.value })}
                      />
                    </div>

                    {block.type === 'quote' && (
                      <div className={styles.fieldGroup}>
                        <label htmlFor={`${id}-attribution-${index}`} className={styles.fieldLabel}>Attribution (optional)</label>
                        <input
                          id={`${id}-attribution-${index}`}
                          className={styles.field}
                          value={block.attribution ?? ''}
                          onChange={event => update(index, { ...block, attribution: event.target.value })}
                        />
                      </div>
                    )}

                    <button type="button" className={styles.dangerTextAction} onClick={() => remove(index)}>Remove block…</button>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <div className={styles.actions} aria-label="Add a copy block">
        <button type="button" className={styles.secondaryAction} onClick={() => add('heading')}>Add heading</button>
        <button type="button" className={styles.secondaryAction} onClick={() => add('paragraph')}>Add paragraph</button>
        <button type="button" className={styles.secondaryAction} onClick={() => add('quote')}>Add quote</button>
      </div>

      {!advanced ? (
        <button type="button" className={styles.textButton} onClick={openAdvanced}>Advanced: edit validated blocks as JSON</button>
      ) : (
        <div className={styles.advancedEditor}>
          <div className={styles.warningNotice}>
            Advanced JSON can represent protected media or older valid blocks. Changes are applied only after the complete block list passes the existing schema, so unsupported content is never discarded silently.
          </div>
          <label htmlFor={`${id}-advanced`} className={styles.fieldLabel}>Advanced content blocks (JSON)</label>
          <textarea
            id={`${id}-advanced`}
            className={`${styles.textarea} ${styles.codeTextarea}`}
            value={advancedValue}
            onChange={event => setAdvancedValue(event.target.value)}
            rows={14}
          />
          {advancedError && <p role="alert" className={styles.errorNotice}>{advancedError}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryAction} onClick={applyAdvanced}>Validate and apply JSON</button>
            <button type="button" className={styles.textButton} onClick={() => { setAdvanced(false); setAdvancedError('') }}>Cancel advanced editing</button>
          </div>
        </div>
      )}

      {error && <p id={`${id}-error`} role="alert" className={styles.fieldError}>{error}</p>}
    </fieldset>
  )
}
