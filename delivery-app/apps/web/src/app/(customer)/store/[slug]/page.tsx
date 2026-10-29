import { redirect } from "next/navigation";

// O app é de uma loja só: o cardápio fica na página inicial.
export default function StorePage() {
  redirect("/");
}
