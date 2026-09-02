import prisma from "./prisma";

export async function syncWhatsAppContactInfo(
  contact: {
    id: string;
    phone: string;
    name?: string | null;
    avatar?: string | null;
    isCustomName?: boolean;
  },
  waInfo: {
    waName?: string | null;
    profilePicUrl?: string | null;
  }
) {
  const { waName, profilePicUrl } = waInfo;
  const updateData: any = {};

  // 1. Profil Fotoğrafı Güncellemesi:
  if (profilePicUrl && !contact.avatar) {
    updateData.avatar = profilePicUrl;
  }

  // 2. İsim Güncellemesi (Yalnızca kullanıcı özel isim vermediyse):
  const isDefaultOrRawNumber =
    !contact.name ||
    contact.name.startsWith("+") ||
    contact.name.replace(/\D/g, "") === contact.phone.replace(/\D/g, "") ||
    contact.name.startsWith("Rehber Kişisi");

  if (waName && !contact.isCustomName && isDefaultOrRawNumber) {
    updateData.name = waName;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: updateData,
    });

    // Also sync to Subscriber table if exists
    await prisma.subscriber.updateMany({
      where: { phone: contact.phone },
      data: updateData,
    });
  }

  return updateData;
}
