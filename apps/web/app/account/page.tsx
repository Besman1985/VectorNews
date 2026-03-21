import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/auth/account-page";
import { userCookieName } from "@/lib/auth-shared";
import { verifyUserSessionToken } from "@/lib/user-session";

export default async function UserAccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(userCookieName)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const session = await verifyUserSessionToken(token);
    return (
      <AccountPage
        initialUser={{
          uid: session.uid,
          email: session.email,
          name: session.name,
          picture: session.picture ?? null
        }}
      />
    );
  } catch {
    redirect("/login");
  }
}
