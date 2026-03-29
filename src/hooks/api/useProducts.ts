import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-client";
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductListParams,
  type ProductResponse,
} from "@/services/products.service";

export function useProducts(params?: ProductListParams) {
  return useQuery({ queryKey: QK.products.list(params), queryFn: () => fetchProducts(params) });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: QK.products.detail(id ?? ""),
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductResponse>) => createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all() });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Product created");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductResponse> }) => updateProduct(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.products.all() });
      qc.invalidateQueries({ queryKey: QK.products.detail(id) });
      qc.invalidateQueries({ queryKey: QK.approvals.all() });
      toast.success("Product updated");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products.all() }); toast.success("Product deleted"); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
