/**
 * Hardware Lab — “清空全部导线”轻量确认弹窗（阶段 1 收尾）
 *
 * 破坏性操作二次确认，不使用浏览器 confirm()。
 * 取消：什么都不改变；确认：由父组件调用 Store.clearWires()。
 * 本组件本身不直接操作 Store，只回传用户选择。
 */

interface ConfirmClearDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmClearDialog({ onCancel, onConfirm }: ConfirmClearDialogProps) {
  return (
    <div
      className="hw-modal-overlay"
      onMouseDown={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        className="hw-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="hw-modal-title">确定清空全部导线？</div>
        <p className="hw-modal-text">此操作将删除当前面包板上的全部导线，面包板孔位与电气节点不会改变。</p>
        <div className="hw-modal-actions">
          <button className="hw-modal-btn" onClick={onCancel}>
            取消
          </button>
          <button className="hw-modal-btn hw-modal-btn-danger" onClick={onConfirm}>
            清空
          </button>
        </div>
      </div>
    </div>
  );
}
