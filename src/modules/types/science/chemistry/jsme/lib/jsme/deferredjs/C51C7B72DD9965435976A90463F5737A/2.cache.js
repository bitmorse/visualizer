$wnd.jsme.runAsyncCallback2('var lea=" (H\'s don\'t count.)",mea="!#6",nea="!@",oea="#15,",pea="#16,",qea="#6,",rea="#7,",sea="#8,",tea="4",uea="5",vea="6",wea=";!R",xea=";A",yea=";D",zea=";H",Aea=";R",Bea=";a",Cea="<SELECT>",v9="Any",Dea="Any except C",w9="Aromatic",Eea="Atom is :",Fea="Atom type :",Gea="Atom/Bond Query",Hea="Bond is :",Iea="Br,",Jea="C,",Kea="Cl,",Lea="F,",Mea="F,Cl,Br,I",Nea="Halogen",Oea="I,",Pea="Missing message: awt.103",Qea="N,",Rea="Nonaromatic",x9="Nonring",Sea="Number of connections :",Tea="Number of hydrogens :  ",\nUea="O,",Vea="Or select one or more from the list :",Wea="P,",y9="Reset",z9="Ring",Xea="S,",Yea="bidiwrapped",Zea="c,",$ea="gwt-ListBox",afa="n,",bfa="o,",cfa="p,",dfa="s,",efa="~";function A9(a,b){if(0>b||b>=a.pb.options.length)throw new HJ;}function B9(a,b){A9(a,b);return a.pb.options[b].value}function C9(){var a;this.pb=(a=Cea,$doc.createElement(a));this.pb[Ao]=$ea}t(380,357,xx,C9);function D9(){D9=v}\nfunction E9(a,b){if(null==b)throw new rG(Pea);var c=-1,d,e,f;f=a.yc.a.pb;e=lC(Xs);e.text=b;e.removeAttribute(Yea);e.value=b;d=f.options.length;(0>c||c>d)&&(c=d);c==d?f.add(e):(c=f.options[c])?f.add(e,c.index):f.add(e)}function F9(){D9();LM.call(this);new cy;this.yc=new G9((MM(),this))}t(448,435,{53:1,55:1,62:1,74:1,82:1},F9);_.qe=function(){return QM(this.yc,this)};\n_.Fe=function(){return(null==this.vc&&(this.vc=xM(this)),this.vc)+fd+this.Gc+fd+this.Hc+fd+this.Dc+vw+this.tc+(this.Cc?l:",hidden")+",current="+B9(this.yc.a,this.yc.a.pb.selectedIndex)};function H9(){R1.call(this,7)}t(461,1,zx,H9);function I9(a){S1.call(this,a,0)}t(466,435,qx,I9);function J9(a){var b=a.j;q2(a.yc.c,b.a,b.b);!zM(a)&&p1(a);j1(a)}\nfunction K9(a,b,c){n2.call(this);this.yc&&M1(this.yc.c,!1);J1(this,!1);YM(this,new R1(0));a=new S1(a,1);l1(this,a,null);a=new cN;l1(a,this.i,null);l1(this,a,null);b&&(this.j=AM(b),I1(this),m2(this.j,~~(fC(b.kc.pb,Fs)/2)-~~(this.Dc/2),~~(fC(b.kc.pb,Es)/2)-~~(this.tc/2)));c&&h1(this,c)}t(609,610,VX,K9);_.Fg=function(){return"OK"};t(619,618,rx);_.ad=function(){J9(new K9(this.b,this.a,(OP(),QP)))};t(621,618,rx);_.ad=function(){!this.a.Sb?this.a.Sb=new L9(this.a):this.a.Sb.yc.c.hb?e3(this.a.Sb.yc.c):J9(this.a.Sb)};\nfunction M9(a,b){e1(b)==a.a?h1(b,(zN(),IN)):h1(b,a.a)}\nfunction N9(a){var b,c,d,e;e=l;d=!1;e1(O9)!=a.a?(e=dd,d=!0):e1(P9)!=a.a?(e=mea,d=!0):e1(Q9)!=a.a?(h1(R9,(zN(),IN)),h1(S9,IN),h1(T9,IN),h1(U9,IN),e=Mea):(b=e1(V9)!=a.a,c=e1(W9)!=a.a,e1(X9)!=a.a&&(b?e+=Zea:c?e+=Jea:e+=qea),e1(Y9)!=a.a&&(b?e+=afa:c?e+=Qea:e+=rea),e1(Z9)!=a.a&&(b?e+=bfa:c?e+=Uea:e+=sea),e1($9)!=a.a&&(b?e+=dfa:c?e+=Xea:e+=pea),e1(a$)!=a.a&&(b?e+=cfa:c?e+=Wea:e+=oea),e1(R9)!=a.a&&(e+=Lea),e1(S9)!=a.a&&(e+=Kea),e1(T9)!=a.a&&(e+=Iea),e1(U9)!=a.a&&(e+=Oea),nU(e,fd)&&(e=e.substr(0,e.length-\n1-0)),1>e.length&&!a.b&&(b?e=hn:c?e=Mf:(h1(O9,(zN(),IN)),e=dd)));b=l;d&&e1(V9)!=a.a&&(b+=Bea);d&&e1(W9)!=a.a&&(b+=xea);e1(b$)!=a.a&&(b+=Aea);e1(c$)!=a.a&&(b+=wea);e1(O9)!=a.a&&0<b.length?e=b.substr(1,b.length-1):e+=b;d=d$.yc.a.pb.selectedIndex;0<d&&(--d,e+=zea+d);d=e$.yc.a.pb.selectedIndex;0<d&&(--d,e+=yea+d);e1(f$)!=a.a&&(e=efa);e1(g$)!=a.a&&(e=lf);e1(h$)!=a.a&&(e=Kf);e1(i$)!=a.a&&(e=nea);GO(a.e.yc,e)}\nfunction j$(a){k$(a);l$(a);var b=d$.yc.a;A9(b,0);b.pb.options[0].selected=!0;b=e$.yc.a;A9(b,0);b.pb.options[0].selected=!0;h1(V9,a.a);h1(W9,a.a);h1(b$,a.a);h1(c$,a.a);h1(d$,a.a);h1(e$,a.a);m$(a)}function k$(a){h1(X9,a.a);h1(Y9,a.a);h1(Z9,a.a);h1($9,a.a);h1(a$,a.a);h1(R9,a.a);h1(S9,a.a);h1(T9,a.a);h1(U9,a.a)}function l$(a){h1(O9,a.a);h1(P9,a.a);h1(Q9,a.a)}function m$(a){h1(f$,a.a);h1(g$,a.a);h1(h$,a.a);h1(i$,a.a);a.b=!1}\nfunction L9(a){K1.call(this,Gea);this.i=new D1(this.Fg());sN(this.q,new o2(this));this.a=(OP(),QP);this.c=a;this.d||(a=AM(a),this.d=new U1(a),m2(this.d,-150,10));this.j=this.d;YM(this,new H9);h1(this,this.a);a=new cN;YM(a,new ZN(0,3,1));l1(a,new I9(Fea),null);O9=new D1(v9);P9=new D1(Dea);Q9=new D1(Nea);l1(a,O9,null);l1(a,P9,null);l1(a,Q9,null);l1(this,a,null);a=new cN;YM(a,new ZN(0,3,1));l1(a,new S1(Vea,0),null);l1(this,a,null);a=new cN;YM(a,new ZN(0,3,1));X9=new D1(sg);Y9=new D1(Vj);Z9=new D1(gk);\n$9=new D1(sk);a$=new D1(ik);R9=new D1(Sh);S9=new D1(Vg);T9=new D1(rg);U9=new D1(bi);l1(a,X9,null);l1(a,Y9,null);l1(a,Z9,null);l1(a,$9,null);l1(a,a$,null);l1(a,R9,null);l1(a,S9,null);l1(a,T9,null);l1(a,U9,null);l1(this,a,null);a=new cN;YM(a,new ZN(0,3,1));d$=new F9;E9(d$,v9);E9(d$,ze);E9(d$,Re);E9(d$,We);E9(d$,ff);l1(a,new I9(Tea),null);l1(a,d$,null);l1(this,a,null);a=new cN;YM(a,new ZN(0,3,1));e$=new F9;E9(e$,v9);E9(e$,ze);E9(e$,Re);E9(e$,We);E9(e$,ff);E9(e$,tea);E9(e$,uea);E9(e$,vea);l1(a,new S1(Sea,\n0),null);l1(a,e$,null);l1(a,new S1(lea,0),null);l1(this,a,null);a=new cN;YM(a,new ZN(0,3,1));l1(a,new I9(Eea),null);V9=new D1(w9);l1(a,V9,null);W9=new D1(Rea);l1(a,W9,null);b$=new D1(z9);l1(a,b$,null);c$=new D1(x9);l1(a,c$,null);l1(this,a,null);a=new cN;h1(a,PN(e1(this)));YM(a,new ZN(0,3,1));l1(a,new I9(Hea),null);f$=new D1(v9);l1(a,f$,null);g$=new D1(w9);l1(a,g$,null);h$=new D1(z9);l1(a,h$,null);i$=new D1(x9);l1(a,i$,null);l1(this,a,null);a=new cN;YM(a,new ZN(1,3,1));this.e=new FO(dd,20);l1(a,this.e,\nnull);l1(a,new D1(y9),null);l1(a,this.i,null);l1(this,a,null);this.yc&&M1(this.yc.c,!1);J1(this,!1);k$(this);l$(this);m$(this);h1(V9,this.a);h1(W9,this.a);h1(b$,this.a);h1(c$,this.a);h1(d$,this.a);h1(e$,this.a);M9(this,O9);I1(this);a=this.j;q2(this.yc.c,a.a,a.b);!zM(this)&&p1(this);j1(this)}t(635,610,VX,L9);\n_.Gg=function(a,b){var c;I(b,y9)?(j$(this),M9(this,O9),N9(this)):B(a.f,52)?(m$(this),YG(a.f)===YG(O9)?(k$(this),l$(this)):YG(a.f)===YG(P9)?(k$(this),l$(this)):YG(a.f)===YG(Q9)?(k$(this),l$(this)):YG(a.f)===YG(b$)?h1(c$,this.a):YG(a.f)===YG(c$)?(h1(b$,this.a),h1(V9,this.a)):YG(a.f)===YG(V9)?(h1(W9,this.a),h1(c$,this.a)):YG(a.f)===YG(W9)?h1(V9,this.a):YG(a.f)===YG(f$)||YG(a.f)===YG(g$)||YG(a.f)===YG(h$)||YG(a.f)===YG(i$)?(j$(this),this.b=!0):l$(this),M9(this,a.f),N9(this)):B(a.f,53)&&(m$(this),c=a.f,\n0==c.yc.a.pb.selectedIndex?h1(c,this.a):h1(c,(zN(),IN)),N9(this));107!=this.c.j&&(this.c.j=107,hN(this.c));return!0};_.b=!1;_.c=null;_.d=null;var O9=_.e=null,f$=null,P9=null,V9=null,g$=null,T9=null,X9=null,e$=null,d$=null,S9=null,R9=null,Q9=null,U9=null,Y9=null,W9=null,c$=null,i$=null,Z9=null,a$=null,b$=null,h$=null,$9=null;function G9(a){GW();IW.call(this);this.a=new C9;oJ(this.a,new n$(this,a),(F_(),F_(),G_))}t(680,678,{},G9);_.Ye=function(){return this.a};_.a=null;\nfunction n$(a,b){this.a=a;this.b=b}t(681,1,{},n$);_.jd=function(a){MM();r2(a,this.b,B9(this.a.a,this.a.a.pb.selectedIndex))};_.a=null;_.b=null;V(609);V(635);V(448);V(680);V(681);V(380);w(OX)(2);\n//@ sourceURL=2.js\n')
