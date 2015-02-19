# odp-to-md

# Installation

  Il est possible d'installer en global avec la commande:
  
    npm install -g
    
  l'exécutable mdconvert est alors disponible partout


# Lancement du script 
```
node mdconvert.js OU mdconvert si installé en global

OPTIONS :
    -f FICHIER.odp
    -d répertoire avec odp (par défaut répertoire courant)
    -o répertoire de sortie (par défaut target)
    -h, --help : aide/usage
```


# Conversion

- [x] Slide du titre
- [x] Liste à puces
- [x] Slide de TP à la fin
- [x] Images dans *ressources/images*
- [x] Bloc de code 
- [x] Tableaux 

# Attention

1. La conversion ne gère pas plusieurs niveaux de liste à puces
2. Il faut renuméroter le slide de TP
3. Les blocs de code converti sont générique,il faut leur ajouter un langage si nécessaire
4. Les slides de titre intermédiaire
5. Il y a beaucoup d'images inutiles générées, il faut faire le tri
6. Les noms des images ne sont pas explicites

