// backend/src/modules/users/dto/change-password.dto.ts
//
// v1.0 — 🔥 NOUVEAU (correctif sécurité) : corps de PATCH /users/me/password.
//   Avant, la route n'acceptait que { password } : toute personne disposant d'un
//   access token volé (poste laissé ouvert, XSS, token en localStorage) pouvait
//   changer le mot de passe et prendre le compte pour de bon. L'ancien mot de
//   passe est désormais exigé. Limite haute à 72 car bcrypt ignore le reste.
//
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Le mot de passe actuel est obligatoire.' })
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères.' })
  @MaxLength(72, { message: 'Le mot de passe ne doit pas dépasser 72 caractères.' })
  password!: string;
}
