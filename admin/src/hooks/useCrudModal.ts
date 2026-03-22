import { useState, useCallback } from 'react';
import type { FormInstance } from 'antd';

export interface UseCrudModalOptions<T> {
  form: FormInstance;
  refetch: () => void;
  onCreate: (values: Record<string, unknown>) => Promise<{ ok?: boolean; error?: string }>;
  onUpdate: (id: string, values: Record<string, unknown>) => Promise<{ ok?: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok?: boolean; error?: string }>;
  getEditValues: (row: T) => Record<string, unknown>;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useCrudModal<T extends { id: string }>({
  form,
  refetch,
  onCreate,
  onUpdate,
  onDelete,
  getEditValues,
  onSuccess = () => {},
  onError = () => {},
}: UseCrudModalOptions<T>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = useCallback(() => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const handleEdit = useCallback(
    (row: T) => {
      setEditing(row);
      form.setFieldsValue(getEditValues(row));
      setModalOpen(true);
    },
    [form, getEditValues]
  );

  const handleSave = useCallback(async () => {
    const vals = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        const res = await onUpdate(editing.id, vals);
        if (res.ok) {
          onSuccess('Đã cập nhật');
          setModalOpen(false);
          refetch();
        } else {
          onError(res.error ?? 'Lỗi');
        }
      } else {
        const res = await onCreate(vals);
        if (res.ok) {
          onSuccess('Đã thêm');
          setModalOpen(false);
          refetch();
        } else {
          onError(res.error ?? 'Lỗi');
        }
      }
    } catch {
      // validation failed
    } finally {
      setSaving(false);
    }
  }, [editing, form, onCreate, onUpdate, refetch, onSuccess, onError]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await onDelete(id);
        if (res.ok) {
          onSuccess('Đã xóa');
          refetch();
        } else {
          onError(res.error ?? 'Lỗi');
        }
      } catch {
        onError('Xóa thất bại');
      }
    },
    [onDelete, refetch, onSuccess, onError]
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  return {
    modalOpen,
    editing,
    saving,
    handleAdd,
    handleEdit,
    handleSave,
    handleDelete,
    closeModal,
    setModalOpen,
  };
}
