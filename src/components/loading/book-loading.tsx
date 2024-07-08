import styles from './book-loading.module.scss'

export function BookLoading() {
  return (
    <div className={styles.wrap}>
      <span className={styles.loader} />
    </div>
  )
}
