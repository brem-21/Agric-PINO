export function getDashboardPath(role?: string): string {
  switch (role) {
    case "FARMER":
      return "/farmer/dashboard";
    case "BUYER":
      return "/buyer/dashboard";
    case "LOGISTICS":
      return "/logistics/dashboard";
    case "VENDOR":
      return "/vendor/dashboard";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
