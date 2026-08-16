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

export interface MediaPlacementOption {
  id: string
  kind: 'photo' | 'video'
  label: string
  previewUrl?: string | null
  status?: string
}

interface Props {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  mediaOptions?: MediaPlacementOption[]
  error?: string
}

function blockName(block: ContentBlock): string {
  if (block.type === 'media') return 'Media placement'
  if (block.type === 'heading' && block.level === 1) return 'Level 1 heading'
  return block.type
}

export default function BlockEditor({ blocks, onChange, mediaOptions = [], error }: Props) {
  const id = useId()
  const [advanced, setAdvanced] = useState(false)
  const [advancedValue, setAdvancedValue] = useState(() => JSON.stringify(blocks, null, 2))
  const [advancedError, setAdvancedError] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState('')

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

  function addMedia() {
    const selected = mediaOptions.find(item => item.id === selectedMediaId)
    if (!selected || blocks.some(block => block.type === 'media' && block.mediaId === selected.id)) return
    const next: ContentBlock[] = [...blocks, { type: 'media', mediaId: selected.id }]
    onChange(next)
    setAdvancedValue(JSON.stringify(next, null, 2))
    setSelectedMediaId('')
  }

  function changeType(index: number, type: EditableBlockType) {
    const current = blocks[index]
    if (current.type === 'quote' && current.attribution?.trim() && type !== 'quote' &&
        !window.confirm('Changing this quote type removes its attribution. Continue?')) return
    const changed = changeBlockType(current, type)
    if (changed) update(index, changed)
  }

  function remove(index: number) {
    const block = blocks[index]
    if (block.type === 'media') {
      if (!window.confirm('Remove this placement from the story? The photo or video stays safely attached to the chapter.')) return
      const next = blocks.filter((_, blockIndex) => blockIndex !== index)
      onChange(next)
      setAdvancedValue(JSON.stringify(next, null, 2))
      return
    }
    if (isBlockNonEmpty(block) &&
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
        Build the chapter with headings, paragraphs, quotations, and placements for attached photos or videos.
      </p>

      {blocks.length === 0 ? (
        <p className={styles.emptyState}>No copy blocks yet. A draft may be saved without copy.</p>
      ) : (
        <ol className={styles.blockList}>
          {blocks.map((block, index) => {
            const editable = isEditableBlock(block)
            const mediaOption = block.type === 'media'
              ? mediaOptions.find(item => item.id === block.mediaId)
              : undefined
            return (
              <li key={`${index}-${block.type}`} className={styles.blockCard}>
                <div className={styles.blockHeader}>
                  <span className={styles.recordType}>Block {index + 1}</span>
                  <div className={styles.blockMoveActions}>
                    <button type="button" className={styles.secondaryAction} disabled={index === 0} onClick={() => move(index, 'earlier')}>Move earlier</button>
                    <button type="button" className={styles.secondaryAction} disabled={index === blocks.length - 1} onClick={() => move(index, 'later')}>Move later</button>
                  </div>
                </div>

                {block.type === 'media' ? (
                  <div className={styles.mediaRow}>
                    {mediaOption?.kind === 'photo' && mediaOption.previewUrl ? (
                      // Signed private media is short-lived and must not be statically optimised.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaOption.previewUrl} alt="" className={styles.mediaThumb} />
                    ) : (
                      <div className={styles.mediaPlaceholder} aria-hidden="true">
                        {mediaOption?.kind === 'video' ? 'Video' : 'Media'}
                      </div>
                    )}
                    <div className={styles.mediaBody}>
                      <strong>{mediaOption?.label || 'Attached media placement'}</strong>
                      <span className={styles.help}>
                        {mediaOption?.kind === 'video' && mediaOption.status !== 'ready'
                          ? `Video status: ${mediaOption.status || 'processing'}`
                          : 'This appears here in both private preview and the published family chapter.'}
                      </span>
                      <button type="button" className={styles.dangerTextAction} onClick={() => remove(index)}>
                        Remove placement…
                      </button>
                    </div>
                  </div>
                ) : !editable ? (
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

      <div className={styles.actions} aria-label="Add a story block">
        <button type="button" className={styles.secondaryAction} onClick={() => add('heading')}>Add heading</button>
        <button type="button" className={styles.secondaryAction} onClick={() => add('paragraph')}>Add paragraph</button>
        <button type="button" className={styles.secondaryAction} onClick={() => add('quote')}>Add quote</button>
      </div>

      {mediaOptions.length > 0 && (
        <div className={styles.fieldGroup}>
          <label htmlFor={`${id}-media-placement`} className={styles.fieldLabel}>Place an attached photo or video</label>
          <div className={styles.actions}>
            <select
              id={`${id}-media-placement`}
              className={styles.select}
              value={selectedMediaId}
              onChange={event => setSelectedMediaId(event.target.value)}
            >
              <option value="">Choose attached media</option>
              {mediaOptions.map(item => {
                const placed = blocks.some(block => block.type === 'media' && block.mediaId === item.id)
                return (
                  <option key={item.id} value={item.id} disabled={placed}>
                    {item.kind === 'photo' ? 'Photo' : 'Video'}: {item.label}{placed ? ' — already placed' : ''}
                  </option>
                )
              })}
            </select>
            <button type="button" className={styles.secondaryAction} disabled={!selectedMediaId} onClick={addMedia}>
              Add to story
            </button>
          </div>
          <p className={styles.help}>Add it, then use Move earlier or Move later to place it between the right passages. Removing a placement never deletes the attached file or its caption.</p>
        </div>
      )}

      {!advanced ? (
        <button type="button" className={styles.textButton} onClick={openAdvanced}>Advanced: edit validated blocks as JSON</button>
      ) : (
        <div className={styles.advancedEditor}>
          <div className={styles.warningNotice}>
            Advanced JSON can represent media placements or older valid blocks. Changes are applied only after the complete block list passes the existing schema, so unsupported content is never discarded silently.
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
