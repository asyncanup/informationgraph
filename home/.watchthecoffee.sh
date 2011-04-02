cd ~/code/informationgraph/home
coffee --watch --compile -o _attachments/scripts/ -c coffeescript/app/ &
coffee --watch --compile -o vendor/ig/_attachments/ -c coffeescript/ig/ &
coffee --watch --compile --bare -o views/ -c coffeescript/views/ &
