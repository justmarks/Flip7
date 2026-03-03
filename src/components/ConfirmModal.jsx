import styles from './ConfirmModal.module.css'

export default function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {cancelLabel ?? 'Cancel'}
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm}>
            {confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
